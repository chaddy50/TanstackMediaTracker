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
vi.mock("#/server/api/hardcover", () => ({
	search: vi.fn(),
	fetchCreatorBio: vi.fn(),
	fetchSeriesInfo: vi.fn(),
}));
vi.mock("#/server/api/igdb", () => ({ search: vi.fn() }));
vi.mock("#/server/api/itunes", () => ({
	searchPodcasts: vi.fn(),
	fetchPodcastChannelInfo: vi.fn(),
}));
vi.mock("#/server/api/tmdb", () => ({
	search: vi.fn(),
	fetchCreatorBio: vi.fn(),
	fetchMovieDetails: vi.fn(),
	fetchTvShowDetails: vi.fn(),
}));

import * as hardcover from "#/server/api/hardcover";
import * as igdb from "#/server/api/igdb";
import * as itunes from "#/server/api/itunes";
import * as tmdb from "#/server/api/tmdb";
import {
	attachLibraryStatus,
	collectApiResults,
	enrichTmdbMetadata,
	performMediaSearch,
	resolveCreatorBiography,
	resolveCreatorName,
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

// ---------------------------------------------------------------------------
// enrichTmdbMetadata
// ---------------------------------------------------------------------------

describe("enrichTmdbMetadata", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(tmdb.fetchMovieDetails).mockResolvedValue({});
		vi.mocked(tmdb.fetchTvShowDetails).mockResolvedValue({});
	});

	it("calls fetchMovieDetails and merges result for tmdb movies", async () => {
		vi.mocked(tmdb.fetchMovieDetails).mockResolvedValue({ runtime: 120 });
		const base = { title: "Dune" };

		const result = await enrichTmdbMetadata("tm-1", "tmdb", "movie", base);

		expect(tmdb.fetchMovieDetails).toHaveBeenCalledWith("tm-1");
		expect(result).toEqual({ title: "Dune", runtime: 120 });
	});

	it("calls fetchTvShowDetails and merges result for tmdb tv shows", async () => {
		vi.mocked(tmdb.fetchTvShowDetails).mockResolvedValue({ seasons: 3 });
		const base = { title: "Breaking Bad" };

		const result = await enrichTmdbMetadata("tm-2", "tmdb", "tv_show", base);

		expect(tmdb.fetchTvShowDetails).toHaveBeenCalledWith("tm-2");
		expect(result).toEqual({ title: "Breaking Bad", seasons: 3 });
	});

	it("returns metadata unchanged for non-tmdb sources", async () => {
		const base = { title: "Dune", author: "Frank Herbert" };

		const result = await enrichTmdbMetadata("hc-1", "hardcover", "book", base);

		expect(tmdb.fetchMovieDetails).not.toHaveBeenCalled();
		expect(tmdb.fetchTvShowDetails).not.toHaveBeenCalled();
		expect(result).toBe(base);
	});
});

// ---------------------------------------------------------------------------
// resolveCreatorName
// ---------------------------------------------------------------------------

describe("resolveCreatorName", () => {
	it("returns author for books", () => {
		expect(resolveCreatorName("book", { author: "Frank Herbert" })).toBe(
			"Frank Herbert",
		);
	});

	it("returns director for movies", () => {
		expect(resolveCreatorName("movie", { director: "Denis Villeneuve" })).toBe(
			"Denis Villeneuve",
		);
	});

	it("returns creator for tv shows", () => {
		expect(
			resolveCreatorName("tv_show", { creator: "Vince Gilligan" }),
		).toBe("Vince Gilligan");
	});

	it("returns creator for podcasts", () => {
		expect(
			resolveCreatorName("podcast", { creator: "Joe Rogan" }),
		).toBe("Joe Rogan");
	});

	it("returns developer for video games", () => {
		expect(
			resolveCreatorName("video_game", { developer: "FromSoftware" }),
		).toBe("FromSoftware");
	});

	it("returns null when the expected field is missing", () => {
		expect(resolveCreatorName("book", { director: "someone" })).toBeNull();
	});

	it("returns null when the expected field is not a string", () => {
		expect(resolveCreatorName("book", { author: 42 })).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// resolveCreatorBiography
// ---------------------------------------------------------------------------

describe("resolveCreatorBiography", () => {
	it("calls hardcover.fetchCreatorBio and returns biography", async () => {
		vi.mocked(hardcover.fetchCreatorBio).mockResolvedValue({
			biography: "Born in 1920...",
		});

		const result = await resolveCreatorBiography(
			"Frank Herbert",
			"hardcover",
			{},
		);

		expect(hardcover.fetchCreatorBio).toHaveBeenCalledWith("Frank Herbert");
		expect(result).toBe("Born in 1920...");
	});

	it("calls tmdb.fetchCreatorBio and returns biography", async () => {
		vi.mocked(tmdb.fetchCreatorBio).mockResolvedValue({
			biography: "Director born in...",
		});

		const result = await resolveCreatorBiography(
			"Denis Villeneuve",
			"tmdb",
			{},
		);

		expect(tmdb.fetchCreatorBio).toHaveBeenCalledWith("Denis Villeneuve");
		expect(result).toBe("Director born in...");
	});

	it("reads developerBio from metadata for igdb and deletes it", async () => {
		const metadata = { developer: "FromSoftware", developerBio: "A studio..." };

		const result = await resolveCreatorBiography(
			"FromSoftware",
			"igdb",
			metadata,
		);

		expect(result).toBe("A studio...");
		expect(metadata.developerBio).toBeUndefined();
	});

	it("calls itunes.fetchPodcastChannelInfo and returns description", async () => {
		vi.mocked(itunes.fetchPodcastChannelInfo).mockResolvedValue({
			description: "A podcast about...",
		});

		const result = await resolveCreatorBiography("Joe Rogan", "itunes", {
			feedUrl: "https://example.com/feed.rss",
		});

		expect(itunes.fetchPodcastChannelInfo).toHaveBeenCalledWith(
			"https://example.com/feed.rss",
		);
		expect(result).toBe("A podcast about...");
	});

	it("returns null for itunes source when feedUrl is missing", async () => {
		const result = await resolveCreatorBiography("Joe Rogan", "itunes", {});
		expect(result).toBeNull();
	});

	it("returns null for an unknown source", async () => {
		const result = await resolveCreatorBiography(
			"Someone",
			"unknown-source",
			{},
		);
		expect(result).toBeNull();
	});

	it("returns null when the API returns null", async () => {
		vi.mocked(hardcover.fetchCreatorBio).mockResolvedValue(null);

		const result = await resolveCreatorBiography(
			"Frank Herbert",
			"hardcover",
			{},
		);
		expect(result).toBeNull();
	});
});
