import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemType } from "#/lib/enums";

vi.mock("#/database/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/features/screens/auth", () => ({ auth: {} }));
vi.mock("#/features/screens/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

import {
	insertGenre,
	insertInstance,
	insertMediaItem,
	truncateAll,
} from "#/tests/integration/helpers";
import { fetchItemsCompletedByGenre } from "../itemsCompletedByGenre.server";

const USER = "test-user";
// The same external item held by both users — impossible under the old schema.
const SHARED_EXTERNAL = {
	externalId: "shared-external-1",
	externalSource: "test",
} as const;
const OTHER_USER = "other-user";
const START = "2024-01-01";
const END = "2024-03-15";

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// genre exclusion
// ---------------------------------------------------------------------------

describe("genre exclusion", () => {
	it("genres with no completions don't appear", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		await insertMediaItem({ type: MediaItemType.BOOK, userId: USER, genreId });
		// No instance inserted — nothing completed

		const result = await fetchItemsCompletedByGenre(USER, START, END);

		expect(result).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// null genre exclusion
// ---------------------------------------------------------------------------

describe("null genre exclusion", () => {
	it("items with no genre are excluded", async () => {
		// No genreId — item has no genre
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,
		});
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });

		const result = await fetchItemsCompletedByGenre(USER, START, END);

		expect(result).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// genre grouping and counting
// ---------------------------------------------------------------------------

describe("genre grouping and counting", () => {
	it("counts distinct items per genre", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId1 = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId,
		});
		const itemId2 = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId,
		});
		await insertInstance({ mediaItemId: itemId1, completedAt: "2024-03-05" });
		await insertInstance({ mediaItemId: itemId2, completedAt: "2024-03-10" });

		const result = await fetchItemsCompletedByGenre(USER, START, END);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(2);
	});

	it("counts an item completed twice only once", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,
			genreId,
		});
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-05" });
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });

		const result = await fetchItemsCompletedByGenre(USER, START, END);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(1);
	});

	it("multiple genres appear separately", async () => {
		const genreIdA = await insertGenre({ userId: USER, name: "Fiction" });
		const genreIdB = await insertGenre({ userId: USER, name: "History" });
		const itemIdA = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId: genreIdA,
		});
		const itemIdB = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId: genreIdB,
		});
		await insertInstance({ mediaItemId: itemIdA, completedAt: "2024-03-05" });
		await insertInstance({ mediaItemId: itemIdB, completedAt: "2024-03-10" });

		const result = await fetchItemsCompletedByGenre(USER, START, END);
		const genreNames = result.map((row) => row.genre);

		expect(genreNames).toContain("Fiction");
		expect(genreNames).toContain("History");
	});
});

// ---------------------------------------------------------------------------
// media type filter
// ---------------------------------------------------------------------------

describe("media type filter", () => {
	it("returns all types when no filter provided", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const bookItemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId,
		});
		const movieItemId = await insertMediaItem({
			type: MediaItemType.MOVIE,
			userId: USER,

			genreId,
		});
		await insertInstance({
			mediaItemId: bookItemId,
			completedAt: "2024-03-05",
		});
		await insertInstance({
			mediaItemId: movieItemId,
			completedAt: "2024-03-10",
		});

		const result = await fetchItemsCompletedByGenre(USER, START, END);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(2);
	});

	it("filters to specified media type only", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const bookItemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId,
		});
		const movieItemId = await insertMediaItem({
			type: MediaItemType.MOVIE,
			userId: USER,

			genreId,
		});
		await insertInstance({
			mediaItemId: bookItemId,
			completedAt: "2024-03-05",
		});
		await insertInstance({
			mediaItemId: movieItemId,
			completedAt: "2024-03-10",
		});

		const result = await fetchItemsCompletedByGenre(USER, START, END, [
			MediaItemType.BOOK,
		]);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(1);
	});

	it("returns empty when no items match the type filter", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const bookItemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId,
		});
		await insertInstance({
			mediaItemId: bookItemId,
			completedAt: "2024-03-05",
		});

		const result = await fetchItemsCompletedByGenre(USER, START, END, [
			MediaItemType.MOVIE,
		]);

		expect(result).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// date range
// ---------------------------------------------------------------------------

describe("date range", () => {
	it("excludes items completed before the cutoff", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,
			genreId,
		});
		// 4 months ago — outside the window
		await insertInstance({ mediaItemId: itemId, completedAt: "2023-11-10" });

		const result = await fetchItemsCompletedByGenre(USER, START, END);

		expect(result).toHaveLength(0);
	});

	it("excludes future-dated items", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,
			genreId,
		});
		await insertInstance({ mediaItemId: itemId, completedAt: "2025-01-01" });

		const result = await fetchItemsCompletedByGenre(USER, START, END);

		expect(result).toHaveLength(0);
	});

	it("includes items completed within the window", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,
			genreId,
		});
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });

		const result = await fetchItemsCompletedByGenre(USER, START, END);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// user scoping
// ---------------------------------------------------------------------------

describe("user scoping", () => {
	it("only returns data for the requesting user", async () => {
		const userGenreId = await insertGenre({ userId: USER, name: "Fiction" });
		const otherGenreId = await insertGenre({
			userId: OTHER_USER,
			name: "Fiction",
		});
		const userItemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId: userGenreId,
		});
		const otherItemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: OTHER_USER,

			genreId: otherGenreId,
		});
		await insertInstance({
			mediaItemId: userItemId,
			completedAt: "2024-03-10",
		});
		await insertInstance({
			mediaItemId: otherItemId,
			completedAt: "2024-03-10",
		});

		const userResult = await fetchItemsCompletedByGenre(USER, START, END);
		const otherResult = await fetchItemsCompletedByGenre(
			OTHER_USER,
			START,
			END,
		);

		expect(userResult.find((row) => row.genre === "Fiction")?.value).toBe(1);
		expect(otherResult.find((row) => row.genre === "Fiction")?.value).toBe(1);
	});
});

describe("cross-user isolation", () => {
	it("excludes another user's item that shares the same external identity", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const otherGenreId = await insertGenre({
			userId: OTHER_USER,
			name: "Fiction",
		});
		const mine = await insertMediaItem({
			userId: USER,
			type: MediaItemType.BOOK,
			genreId,
			...SHARED_EXTERNAL,
		});
		const theirs = await insertMediaItem({
			userId: OTHER_USER,
			type: MediaItemType.BOOK,
			genreId: otherGenreId,
			...SHARED_EXTERNAL,
		});
		await insertInstance({ mediaItemId: mine, completedAt: "2024-03-10" });
		await insertInstance({ mediaItemId: theirs, completedAt: "2024-03-10" });

		const result = await fetchItemsCompletedByGenre(USER, START, END);

		expect(result).toEqual([{ genre: "Fiction", value: 1 }]);
	});
});
