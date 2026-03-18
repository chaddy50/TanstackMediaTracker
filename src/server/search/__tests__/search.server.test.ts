import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ExternalSearchResult } from "#/server/api/types";
import { MediaItemStatus } from "#/server/enums";

vi.mock("#/db/index", () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn().mockResolvedValue([]),
			})),
		})),
	},
}));
vi.mock("#/server/auth", () => ({ auth: {} }));
vi.mock("#/server/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));
vi.mock("#/server/api/hardcover", () => ({ search: vi.fn() }));
vi.mock("#/server/api/igdb", () => ({ search: vi.fn() }));
vi.mock("#/server/api/itunes", () => ({ searchPodcasts: vi.fn() }));
vi.mock("#/server/api/tmdb", () => ({ search: vi.fn() }));

import * as hardcover from "#/server/api/hardcover";
import * as igdb from "#/server/api/igdb";
import * as itunes from "#/server/api/itunes";
import * as tmdb from "#/server/api/tmdb";
import {
	attachLibraryStatus,
	collectApiResults,
	performMediaSearch,
} from "../search.server";

const baseResult: ExternalSearchResult = {
	externalId: "42",
	externalSource: "tmdb",
	type: "movie",
	title: "Dune",
	metadata: {},
};

const gameResult: ExternalSearchResult = {
	externalId: "game-1",
	externalSource: "igdb",
	type: "video_game",
	title: "Elden Ring",
	metadata: {},
};

// ---------------------------------------------------------------------------
// collectApiResults
// ---------------------------------------------------------------------------

describe("collectApiResults", () => {
	it("combines all results when every promise fulfilled", () => {
		const settled: PromiseSettledResult<ExternalSearchResult[]>[] = [
			{ status: "fulfilled", value: [{ ...baseResult, externalId: "1" }] },
			{ status: "fulfilled", value: [{ ...baseResult, externalId: "2" }] },
		];
		const results = collectApiResults(settled);
		expect(results).toHaveLength(2);
		expect(results.map((r) => r.externalId)).toEqual(["1", "2"]);
	});

	it("drops results from rejected promises and returns the rest", () => {
		const settled: PromiseSettledResult<ExternalSearchResult[]>[] = [
			{ status: "fulfilled", value: [{ ...baseResult, externalId: "1" }] },
			{ status: "rejected", reason: new Error("API down") },
			{ status: "fulfilled", value: [{ ...baseResult, externalId: "3" }] },
		];
		const results = collectApiResults(settled);
		expect(results).toHaveLength(2);
		expect(results.map((r) => r.externalId)).toEqual(["1", "3"]);
	});

	it("returns an empty array when all promises rejected", () => {
		const settled: PromiseSettledResult<ExternalSearchResult[]>[] = [
			{ status: "rejected", reason: new Error("API 1 down") },
			{ status: "rejected", reason: new Error("API 2 down") },
		];
		expect(collectApiResults(settled)).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// attachLibraryStatus
// ---------------------------------------------------------------------------

describe("attachLibraryStatus", () => {
	it("returns results unchanged when no metadata exists for them", () => {
		const results = attachLibraryStatus([baseResult], [], []);
		expect(results).toHaveLength(1);
		expect(results[0]).toEqual(baseResult);
		expect(results[0].mediaItemId).toBeUndefined();
		expect(results[0].status).toBeUndefined();
	});

	it("returns result unchanged when metadata matches but user does not have it in their library", () => {
		const existingMetadata = [
			{ id: 10, externalId: "42", externalSource: "tmdb" },
		];
		const results = attachLibraryStatus([baseResult], existingMetadata, []);
		expect(results[0].mediaItemId).toBeUndefined();
		expect(results[0].status).toBeUndefined();
	});

	it("attaches mediaItemId and status when result is in the user's library", () => {
		const existingMetadata = [
			{ id: 10, externalId: "42", externalSource: "tmdb" },
		];
		const existingItems = [
			{
				id: 99,
				mediaItemMetadataId: 10,
				status: MediaItemStatus.COMPLETED,
			},
		];
		const results = attachLibraryStatus(
			[baseResult],
			existingMetadata,
			existingItems,
		);
		expect(results[0].mediaItemId).toBe(99);
		expect(results[0].status).toBe(MediaItemStatus.COMPLETED);
	});

	it("handles mixed results independently — library items enriched, others unchanged", () => {
		const libraryResult: ExternalSearchResult = {
			...baseResult,
			externalId: "42",
			title: "Dune",
		};
		const newResult: ExternalSearchResult = {
			...baseResult,
			externalId: "99",
			title: "Arrival",
		};

		const existingMetadata = [
			{ id: 10, externalId: "42", externalSource: "tmdb" },
		];
		const existingItems = [
			{ id: 7, mediaItemMetadataId: 10, status: MediaItemStatus.IN_PROGRESS },
		];

		const results = attachLibraryStatus(
			[libraryResult, newResult],
			existingMetadata,
			existingItems,
		);

		expect(results[0].mediaItemId).toBe(7);
		expect(results[0].status).toBe(MediaItemStatus.IN_PROGRESS);
		expect(results[1].mediaItemId).toBeUndefined();
		expect(results[1].status).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// handleSearchMedia
// ---------------------------------------------------------------------------

describe("handleSearchMedia", () => {
	beforeEach(() => {
		vi.mocked(hardcover.search).mockResolvedValue([]);
		vi.mocked(igdb.search).mockResolvedValue([]);
		vi.mocked(itunes.searchPodcasts).mockResolvedValue([]);
		vi.mocked(tmdb.search).mockResolvedValue([]);
	});

	it("returns results from surviving APIs when one throws", async () => {
		vi.mocked(hardcover.search).mockRejectedValue(new Error("API down"));
		vi.mocked(igdb.search).mockResolvedValue([gameResult]);

		const result = await performMediaSearch("user-1", "elden ring", "all");

		expect(result).toHaveLength(1);
		expect(result[0].externalId).toBe("game-1");
	});

	it("returns empty array when all APIs throw", async () => {
		vi.mocked(hardcover.search).mockRejectedValue(new Error("down"));
		vi.mocked(igdb.search).mockRejectedValue(new Error("down"));
		vi.mocked(itunes.searchPodcasts).mockRejectedValue(new Error("down"));
		vi.mocked(tmdb.search).mockRejectedValue(new Error("down"));

		const result = await performMediaSearch("user-1", "test", "all");

		expect(result).toEqual([]);
	});
});
