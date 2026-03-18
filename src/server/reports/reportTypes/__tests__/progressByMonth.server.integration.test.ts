import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemType } from "#/server/enums";

vi.mock("#/db/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/server/auth", () => ({ auth: {} }));
vi.mock("#/server/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

import {
	insertInstance,
	insertMediaItem,
	insertMetadata,
	truncateAll,
} from "#/tests/integration/helpers";
import { fetchProgressByMonth } from "../progressByMonth.server";

const USER = "test-user";
const OTHER_USER = "other-user";
const START = "2024-01-01";
const END = "2024-03-15";

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// deduplication
// ---------------------------------------------------------------------------

describe("deduplication", () => {
	it("counts an item completed twice in the same month only once", async () => {
		const metadataId = await insertMetadata({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 200 },
		});
		const itemId = await insertMediaItem({ userId: USER, metadataId });
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-01" });
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });

		const result = await fetchProgressByMonth(USER, MediaItemType.BOOK, START, END);
		const march = result.find((r) => r.month === "2024-03");

		expect(march?.value).toBe(200);
	});
});

// ---------------------------------------------------------------------------
// per-type metrics (smoke tests confirming SQL mirrors computeProgressMetric)
// ---------------------------------------------------------------------------

describe("per-type metrics", () => {
	it("book sums pageCount", async () => {
		const metadataId = await insertMetadata({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 300 },
		});
		const itemId = await insertMediaItem({ userId: USER, metadataId });
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });

		const result = await fetchProgressByMonth(USER, MediaItemType.BOOK, START, END);
		expect(result.find((r) => r.month === "2024-03")?.value).toBe(300);
	});

	it("movie sums runtime / 60", async () => {
		const metadataId = await insertMetadata({
			type: MediaItemType.MOVIE,
			metadata: { runtime: 120 },
		});
		const itemId = await insertMediaItem({ userId: USER, metadataId });
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });

		const result = await fetchProgressByMonth(USER, MediaItemType.MOVIE, START, END);
		expect(result.find((r) => r.month === "2024-03")?.value).toBe(2);
	});

	it("tv_show sums numberOfEpisodes", async () => {
		const metadataId = await insertMetadata({
			type: MediaItemType.TV_SHOW,
			metadata: { numberOfEpisodes: 8 },
		});
		const itemId = await insertMediaItem({ userId: USER, metadataId });
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });

		const result = await fetchProgressByMonth(USER, MediaItemType.TV_SHOW, START, END);
		expect(result.find((r) => r.month === "2024-03")?.value).toBe(8);
	});

	it("podcast sums totalDuration / 60", async () => {
		const metadataId = await insertMetadata({
			type: MediaItemType.PODCAST,
			metadata: { totalDuration: 180 },
		});
		const itemId = await insertMediaItem({ userId: USER, metadataId });
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });

		const result = await fetchProgressByMonth(USER, MediaItemType.PODCAST, START, END);
		expect(result.find((r) => r.month === "2024-03")?.value).toBe(3);
	});

	it("video_game sums timeToBeatNormally", async () => {
		const metadataId = await insertMetadata({
			type: MediaItemType.VIDEO_GAME,
			metadata: { timeToBeatNormally: 40 },
		});
		const itemId = await insertMediaItem({ userId: USER, metadataId });
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });

		const result = await fetchProgressByMonth(USER, MediaItemType.VIDEO_GAME, START, END);
		expect(result.find((r) => r.month === "2024-03")?.value).toBe(40);
	});

	it("video_game falls back to timeToBeatHastily when timeToBeatNormally is absent", async () => {
		const metadataId = await insertMetadata({
			type: MediaItemType.VIDEO_GAME,
			metadata: { timeToBeatHastily: 20 },
		});
		const itemId = await insertMediaItem({ userId: USER, metadataId });
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });

		const result = await fetchProgressByMonth(USER, MediaItemType.VIDEO_GAME, START, END);
		expect(result.find((r) => r.month === "2024-03")?.value).toBe(20);
	});
});

// ---------------------------------------------------------------------------
// date range
// ---------------------------------------------------------------------------

describe("date range", () => {
	it("excludes items completed before the cutoff", async () => {
		const metadataId = await insertMetadata({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 400 },
		});
		const itemId = await insertMediaItem({ userId: USER, metadataId });
		// 4 months ago — outside the window
		await insertInstance({ mediaItemId: itemId, completedAt: "2023-11-10" });

		const result = await fetchProgressByMonth(USER, MediaItemType.BOOK, START, END);
		expect(result.every((r) => r.value === 0)).toBe(true);
	});

	it("excludes future-dated items", async () => {
		const metadataId = await insertMetadata({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 400 },
		});
		const itemId = await insertMediaItem({ userId: USER, metadataId });
		await insertInstance({ mediaItemId: itemId, completedAt: "2025-01-01" });

		const result = await fetchProgressByMonth(USER, MediaItemType.BOOK, START, END);
		expect(result.every((r) => r.value === 0)).toBe(true);
	});

	it("sums multiple items completed in the same month", async () => {
		const metadataId1 = await insertMetadata({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 100 },
		});
		const metadataId2 = await insertMetadata({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 50 },
		});
		const itemId1 = await insertMediaItem({ userId: USER, metadataId: metadataId1 });
		const itemId2 = await insertMediaItem({ userId: USER, metadataId: metadataId2 });
		await insertInstance({ mediaItemId: itemId1, completedAt: "2024-03-05" });
		await insertInstance({ mediaItemId: itemId2, completedAt: "2024-03-10" });

		const result = await fetchProgressByMonth(USER, MediaItemType.BOOK, START, END);
		expect(result.find((r) => r.month === "2024-03")?.value).toBe(150);
	});
});

// ---------------------------------------------------------------------------
// user scoping
// ---------------------------------------------------------------------------

describe("user scoping", () => {
	it("only returns data for the requesting user", async () => {
		const metadataId = await insertMetadata({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 200 },
		});
		const userItemId = await insertMediaItem({ userId: USER, metadataId });
		const otherItemId = await insertMediaItem({ userId: OTHER_USER, metadataId });
		await insertInstance({ mediaItemId: userItemId, completedAt: "2024-03-10" });
		await insertInstance({ mediaItemId: otherItemId, completedAt: "2024-03-10" });

		const userResult = await fetchProgressByMonth(USER, MediaItemType.BOOK, START, END);
		const otherResult = await fetchProgressByMonth(OTHER_USER, MediaItemType.BOOK, START, END);

		expect(userResult.find((r) => r.month === "2024-03")?.value).toBe(200);
		expect(otherResult.find((r) => r.month === "2024-03")?.value).toBe(200);
	});
});
