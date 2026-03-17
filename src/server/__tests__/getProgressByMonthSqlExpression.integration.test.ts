import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemType } from "#/lib/enums";

vi.mock("#/db/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/lib/auth", () => ({ auth: {} }));
vi.mock("#/lib/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

import { testDb } from "#/tests/integration/db";
import { insertMetadata, truncateAll } from "#/tests/integration/helpers";
import { getProgressByMonthSqlExpression } from "../reports.server";

beforeEach(() => truncateAll());

async function evalMetric(
	mediaType: MediaItemType,
	metadata: Record<string, unknown>,
): Promise<number> {
	const metadataId = await insertMetadata({ type: mediaType, metadata });
	const rows = await testDb.execute<{ value: number }>(
		sql`SELECT ${getProgressByMonthSqlExpression(mediaType)} AS value FROM media_metadata mim WHERE mim.id = ${metadataId}`,
	);
	return Number(rows.rows[0]?.value ?? 0);
}

// ---------------------------------------------------------------------------
// per-type metric expressions
// ---------------------------------------------------------------------------

describe("getProgressByMonthSqlExpression", () => {
	describe("book", () => {
		it("returns pageCount", async () => {
			expect(await evalMetric(MediaItemType.BOOK, { pageCount: 300 })).toBe(
				300,
			);
		});

		it("returns 0 when pageCount is missing", async () => {
			expect(await evalMetric(MediaItemType.BOOK, {})).toBe(0);
		});
	});

	describe("tv_show", () => {
		it("returns numberOfEpisodes", async () => {
			expect(
				await evalMetric(MediaItemType.TV_SHOW, { numberOfEpisodes: 8 }),
			).toBe(8);
		});

		it("returns 0 when numberOfEpisodes is missing", async () => {
			expect(await evalMetric(MediaItemType.TV_SHOW, {})).toBe(0);
		});
	});

	describe("movie", () => {
		it("returns runtime / 60", async () => {
			expect(await evalMetric(MediaItemType.MOVIE, { runtime: 120 })).toBe(2);
		});

		it("returns 0 when runtime is missing", async () => {
			expect(await evalMetric(MediaItemType.MOVIE, {})).toBe(0);
		});
	});

	describe("podcast", () => {
		it("returns totalDuration / 60", async () => {
			expect(
				await evalMetric(MediaItemType.PODCAST, { totalDuration: 180 }),
			).toBe(3);
		});

		it("returns 0 when totalDuration is missing", async () => {
			expect(await evalMetric(MediaItemType.PODCAST, {})).toBe(0);
		});
	});

	describe("video_game", () => {
		it("returns timeToBeatNormally", async () => {
			expect(
				await evalMetric(MediaItemType.VIDEO_GAME, { timeToBeatNormally: 40 }),
			).toBe(40);
		});

		it("falls back to timeToBeatHastily when timeToBeatNormally is absent", async () => {
			expect(
				await evalMetric(MediaItemType.VIDEO_GAME, { timeToBeatHastily: 20 }),
			).toBe(20);
		});

		it("returns 0 when both time-to-beat fields are absent", async () => {
			expect(await evalMetric(MediaItemType.VIDEO_GAME, {})).toBe(0);
		});
	});
});
