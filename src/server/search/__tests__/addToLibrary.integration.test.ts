import { beforeEach, describe, expect, it, vi } from "vitest";

// Redirect all db calls to the test database.
// vi.mock is hoisted before imports, so handleAddToLibrary will see testDb.
vi.mock("#/db/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/server/auth", () => ({ auth: {} }));
vi.mock("#/server/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));
vi.mock("#/server/api/hardcover", () => ({
	fetchSeriesInfo: vi.fn().mockResolvedValue(null),
	fetchCreatorBio: vi.fn().mockResolvedValue(null),
}));
vi.mock("#/server/api/tmdb", () => ({
	fetchMovieDetails: vi.fn().mockResolvedValue({}),
	fetchTvShowDetails: vi.fn().mockResolvedValue({}),
	fetchCreatorBio: vi.fn().mockResolvedValue(null),
	search: vi.fn().mockResolvedValue([]),
}));
vi.mock("#/server/api/itunes", () => ({
	fetchPodcastChannelInfo: vi.fn().mockResolvedValue(null),
	searchPodcasts: vi.fn().mockResolvedValue([]),
}));
vi.mock("#/server/api/igdb", () => ({
	search: vi.fn().mockResolvedValue([]),
}));

import { creators, mediaItemMetadata, mediaItems, series } from "#/db/schema";
import { MediaItemType } from "#/server/enums";
import { testDb } from "#/tests/integration/db";
import {
	insertMediaItem,
	insertMetadata,
	insertSeries,
	truncateAll,
} from "#/tests/integration/helpers";
import { count, eq } from "drizzle-orm";
import { handleAddToLibrary } from "../search.server";

const USER = "test-user";

const BASE_BOOK_INPUT = {
	externalId: "hc-123",
	externalSource: "hardcover",
	type: MediaItemType.BOOK,
	title: "Dune",
	metadata: {
		author: "Frank Herbert",
		series: "Dune",
	},
} as const;

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleAddToLibrary", () => {
	it("adding the same item twice does not create duplicate metadata, series, or creator rows", async () => {
		await handleAddToLibrary(BASE_BOOK_INPUT, USER);
		const secondResult = await handleAddToLibrary(BASE_BOOK_INPUT, USER);

		const [metadataCount] = await testDb
			.select({ count: count() })
			.from(mediaItemMetadata);
		const [seriesCount] = await testDb.select({ count: count() }).from(series);
		const [creatorsCount] = await testDb
			.select({ count: count() })
			.from(creators);
		const [itemsCount] = await testDb
			.select({ count: count() })
			.from(mediaItems);

		expect(metadataCount?.count).toBe(1);
		expect(seriesCount?.count).toBe(1);
		expect(creatorsCount?.count).toBe(1);
		expect(itemsCount?.count).toBe(1);

		// Both calls should return the same mediaItemId
		const firstResult = await handleAddToLibrary(BASE_BOOK_INPUT, USER);
		expect(firstResult.mediaItemId).toBe(secondResult.mediaItemId);
	});

	it("links to an existing series instead of creating a new one", async () => {
		const existingSeriesId = await insertSeries({
			userId: USER,
			name: "Dune",
			type: MediaItemType.BOOK,
		});

		await handleAddToLibrary(BASE_BOOK_INPUT, USER);

		const [seriesCount] = await testDb.select({ count: count() }).from(series);
		expect(seriesCount?.count).toBe(1);

		const [item] = await testDb
			.select({ seriesId: mediaItems.seriesId })
			.from(mediaItems);
		expect(item?.seriesId).toBe(existingSeriesId);
	});

	it("backfills seriesId and creatorId on an existing item that had null values", async () => {
		const metadataId = await insertMetadata({
			type: MediaItemType.BOOK,
			title: "Dune",
			externalId: "hc-123",
			externalSource: "hardcover",
		});
		const existingItemId = await insertMediaItem({
			userId: USER,
			metadataId,
			seriesId: undefined,
			creatorId: undefined,
		});

		const result = await handleAddToLibrary(BASE_BOOK_INPUT, USER);

		// Should return the existing item, not create a new one
		expect(result.mediaItemId).toBe(existingItemId);

		const [updated] = await testDb
			.select({
				seriesId: mediaItems.seriesId,
				creatorId: mediaItems.creatorId,
			})
			.from(mediaItems)
			.where(eq(mediaItems.id, existingItemId));

		expect(updated?.seriesId).not.toBeNull();
		expect(updated?.creatorId).not.toBeNull();
	});
});
