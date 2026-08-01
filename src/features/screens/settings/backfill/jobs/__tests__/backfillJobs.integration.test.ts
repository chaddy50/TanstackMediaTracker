import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#/database/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/features/screens/auth", () => ({ auth: {} }));
vi.mock("#/features/screens/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));
vi.mock("#/features/mediaItemSearch/api/tmdb", () => ({
	fetchMovieDetails: vi.fn(),
	fetchTvShowDetails: vi.fn(),
	fetchCreatorBio: vi.fn().mockResolvedValue(null),
}));
vi.mock("#/features/mediaItemSearch/api/igdb", () => ({
	fetchGameDeveloper: vi.fn(),
	getAccessToken: vi.fn().mockResolvedValue("token"),
	fetchTimesToBeat: vi.fn(),
}));
vi.mock("#/features/mediaItemSearch/api/hardcover", () => ({
	fetchCreatorBio: vi.fn().mockResolvedValue(null),
}));
vi.mock("#/features/mediaItemSearch/api/itunes", () => ({
	fetchPodcastChannelInfo: vi.fn().mockResolvedValue(null),
}));

import { eq } from "drizzle-orm";
import { mediaItems } from "#/database/schema";
import * as igdb from "#/features/mediaItemSearch/api/igdb";
import * as tmdb from "#/features/mediaItemSearch/api/tmdb";
import { MediaItemType } from "#/lib/enums";
import { testDb } from "#/tests/integration/db";
import { insertMediaItem, truncateAll } from "#/tests/integration/helpers";
import { runCreatorsBackfillJob } from "../creators";
import { runTimeToCompleteBackfill } from "../timeToComplete";

const USER_A = "user-a";
const USER_B = "user-b";

const SHARED_MOVIE = {
	externalId: "tmdb-438631",
	externalSource: "tmdb",
} as const;
const SHARED_GAME = {
	externalId: "igdb-1",
	externalSource: "igdb",
} as const;

beforeEach(async () => {
	await truncateAll();
	vi.clearAllMocks();
	vi.mocked(tmdb.fetchMovieDetails).mockResolvedValue({
		director: "Denis Villeneuve",
		runtime: 155,
	});
	vi.mocked(tmdb.fetchTvShowDetails).mockResolvedValue({ episodeRuntime: 42 });
	vi.mocked(igdb.fetchGameDeveloper).mockResolvedValue({
		developer: "Westwood",
		developerBio: null,
	});
	vi.mocked(igdb.fetchTimesToBeat).mockResolvedValue(
		new Map([
			[
				1,
				{
					timeToBeatHastily: 30,
					timeToBeatNormally: 40,
					timeToBeatCompletely: 60,
					timeToBeatFetchedAt: "2026-01-01T00:00:00.000Z",
				},
			],
		]),
	);
	process.env.IGDB_CLIENT_ID = "test-client";
});

async function readMetadata(itemId: number) {
	const [row] = await testDb
		.select({ metadata: mediaItems.metadata })
		.from(mediaItems)
		.where(eq(mediaItems.id, itemId));
	return row?.metadata as Record<string, unknown>;
}

describe("runCreatorsBackfillJob", () => {
	it("patches the caller's movie director without touching the other user's copy", async () => {
		const itemA = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			metadata: {},
			...SHARED_MOVIE,
		});
		const itemB = await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.MOVIE,
			metadata: {},
			...SHARED_MOVIE,
		});

		await runCreatorsBackfillJob(USER_A);

		expect((await readMetadata(itemA)).director).toBe("Denis Villeneuve");
		expect(await readMetadata(itemB)).toEqual({});
	});

	it("patches the caller's game developer only", async () => {
		const itemA = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.VIDEO_GAME,
			metadata: {},
			...SHARED_GAME,
		});
		const itemB = await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.VIDEO_GAME,
			metadata: {},
			...SHARED_GAME,
		});

		await runCreatorsBackfillJob(USER_A);

		expect((await readMetadata(itemA)).developer).toBe("Westwood");
		expect(await readMetadata(itemB)).toEqual({});
	});

	it("links creatorId from metadata already present, without an API call", async () => {
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			metadata: { author: "Frank Herbert" },
		});

		const result = await runCreatorsBackfillJob(USER_A);

		expect(result.processedCount).toBe(1);
		const [row] = await testDb
			.select({ creatorId: mediaItems.creatorId })
			.from(mediaItems)
			.where(eq(mediaItems.id, itemId));
		expect(row?.creatorId).not.toBeNull();
		expect(tmdb.fetchMovieDetails).not.toHaveBeenCalled();
	});

	it("ignores another user's unlinked items entirely", async () => {
		await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.BOOK,
			metadata: { author: "Frank Herbert" },
		});

		const result = await runCreatorsBackfillJob(USER_A);

		expect(result.processedCount).toBe(0);
	});
});

describe("runTimeToCompleteBackfill", () => {
	it("writes movie runtime for the caller only", async () => {
		const itemA = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			metadata: {},
			...SHARED_MOVIE,
		});
		const itemB = await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.MOVIE,
			metadata: {},
			...SHARED_MOVIE,
		});

		await runTimeToCompleteBackfill(USER_A);

		expect((await readMetadata(itemA)).runtime).toBe(155);
		expect(await readMetadata(itemB)).toEqual({});
	});

	it("writes tv episodeRuntime for the caller only", async () => {
		const itemA = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.TV_SHOW,
			metadata: {},
			externalId: "tmdb-63639",
			externalSource: "tmdb",
		});
		const itemB = await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.TV_SHOW,
			metadata: {},
			externalId: "tmdb-63639",
			externalSource: "tmdb",
		});

		await runTimeToCompleteBackfill(USER_A);

		expect((await readMetadata(itemA)).episodeRuntime).toBe(42);
		expect(await readMetadata(itemB)).toEqual({});
	});

	it("writes igdb time-to-beat fields for the caller only", async () => {
		const itemA = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.VIDEO_GAME,
			metadata: {},
			externalId: "1",
			externalSource: "igdb",
		});
		const itemB = await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.VIDEO_GAME,
			metadata: {},
			externalId: "1",
			externalSource: "igdb",
		});

		await runTimeToCompleteBackfill(USER_A);

		expect((await readMetadata(itemA)).timeToBeatNormally).toBe(40);
		expect(await readMetadata(itemB)).toEqual({});
	});

	it("skips rows that already carry the field", async () => {
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			metadata: { runtime: 100 },
			...SHARED_MOVIE,
		});

		const result = await runTimeToCompleteBackfill(USER_A);

		expect(result.processedCount).toBe(0);
		expect(tmdb.fetchMovieDetails).not.toHaveBeenCalled();
	});
});
