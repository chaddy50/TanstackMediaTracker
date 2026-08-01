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
vi.mock("#/features/mediaItemSearch/api/hardcover", () => ({
	search: vi.fn().mockResolvedValue([]),
	fetchSeriesInfo: vi.fn().mockResolvedValue(null),
	fetchCreatorBio: vi.fn().mockResolvedValue(null),
}));
vi.mock("#/features/mediaItemSearch/api/tmdb", () => ({
	search: vi.fn().mockResolvedValue([]),
	fetchMovieDetails: vi.fn().mockResolvedValue({}),
	fetchTvShowDetails: vi.fn().mockResolvedValue({}),
	fetchCreatorBio: vi.fn().mockResolvedValue(null),
}));
vi.mock("#/features/mediaItemSearch/api/itunes", () => ({
	searchPodcasts: vi.fn().mockResolvedValue([]),
	fetchPodcastChannelInfo: vi.fn().mockResolvedValue(null),
}));
vi.mock("#/features/mediaItemSearch/api/igdb", () => ({
	search: vi.fn().mockResolvedValue([]),
}));

import * as tmdb from "#/features/mediaItemSearch/api/tmdb";
import type { ExternalSearchResult } from "#/features/mediaItemSearch/api/types";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";
import { insertMediaItem, truncateAll } from "#/tests/integration/helpers";
import { performMediaSearch } from "../mediaItemSearch.server";

const USER_A = "user-a";
const USER_B = "user-b";

const DUNE_RESULT: ExternalSearchResult = {
	externalId: "tmdb-438631",
	externalSource: "tmdb",
	type: MediaItemType.MOVIE,
	title: "Dune",
	metadata: {},
};

beforeEach(async () => {
	await truncateAll();
	vi.mocked(tmdb.search).mockResolvedValue([DUNE_RESULT]);
});

describe("performMediaSearch library status", () => {
	// The read half of the shared-metadata bug: the old query had no userId
	// filter at all, so another user's row could mark a result as owned.
	it("does not mark a result the caller does not own", async () => {
		await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.MOVIE,
			externalId: DUNE_RESULT.externalId,
			externalSource: DUNE_RESULT.externalSource,
		});

		const [result] = await performMediaSearch(
			USER_A,
			"dune",
			MediaItemType.MOVIE,
		);

		expect(result.mediaItemId).toBeUndefined();
		expect(result.status).toBeUndefined();
	});

	it("attaches the caller's own mediaItemId and status", async () => {
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			externalId: DUNE_RESULT.externalId,
			externalSource: DUNE_RESULT.externalSource,
			status: MediaItemStatus.IN_PROGRESS,
		});

		const [result] = await performMediaSearch(
			USER_A,
			"dune",
			MediaItemType.MOVIE,
		);

		expect(result.mediaItemId).toBe(itemId);
		expect(result.status).toBe(MediaItemStatus.IN_PROGRESS);
	});

	it("gives each user their own status for the same external item", async () => {
		const itemA = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			externalId: DUNE_RESULT.externalId,
			externalSource: DUNE_RESULT.externalSource,
			status: MediaItemStatus.IN_PROGRESS,
		});
		const itemB = await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.MOVIE,
			externalId: DUNE_RESULT.externalId,
			externalSource: DUNE_RESULT.externalSource,
			status: MediaItemStatus.BACKLOG,
		});

		const [forA] = await performMediaSearch(
			USER_A,
			"dune",
			MediaItemType.MOVIE,
		);
		const [forB] = await performMediaSearch(
			USER_B,
			"dune",
			MediaItemType.MOVIE,
		);

		expect(forA.mediaItemId).toBe(itemA);
		expect(forA.status).toBe(MediaItemStatus.IN_PROGRESS);
		expect(forB.mediaItemId).toBe(itemB);
		expect(forB.status).toBe(MediaItemStatus.BACKLOG);
	});

	it("passes unmatched results through unchanged", async () => {
		const [result] = await performMediaSearch(
			USER_A,
			"dune",
			MediaItemType.MOVIE,
		);
		expect(result).toEqual(DUNE_RESULT);
	});

	it("matches on externalSource as well as externalId", async () => {
		// Same externalId, different provider — must not cross-attach.
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.VIDEO_GAME,
			externalId: DUNE_RESULT.externalId,
			externalSource: "igdb",
		});

		const [result] = await performMediaSearch(
			USER_A,
			"dune",
			MediaItemType.MOVIE,
		);

		expect(result.mediaItemId).toBeUndefined();
	});
});
