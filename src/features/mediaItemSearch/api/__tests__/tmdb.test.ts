import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExternalSearchResult } from "#/features/mediaItemSearch/api/types";
import { MediaItemType } from "#/lib/enums";

const COLLECTION_NAME = "The Lord of the Rings Collection";

function jsonResponse(body: unknown, { ok = true }: { ok?: boolean } = {}) {
	return { ok, status: ok ? 200 : 500, json: async () => body };
}

const MOVIE_PART = {
	id: 120,
	title: "The Fellowship of the Ring",
	overview: "A hobbit inherits a dangerous ring.",
	poster_path: "/abc.jpg",
	release_date: "2001-12-19",
};

/**
 * Drives fetchCollectionMovies against the two responses it chains — the
 * collection search, then the collection detail.
 */
async function fetchCollectionMoviesWith(
	responses: unknown[],
	{ hasApiKey = true }: { hasApiKey?: boolean } = {},
): Promise<{
	results: ExternalSearchResult[];
	fetchMock: ReturnType<typeof vi.fn>;
}> {
	if (hasApiKey) {
		vi.stubEnv("TMDB_API_KEY", "test-key");
	} else {
		vi.stubEnv("TMDB_API_KEY", "");
	}

	const fetchMock = vi.fn();
	for (const response of responses) {
		fetchMock.mockResolvedValueOnce(response);
	}
	vi.stubGlobal("fetch", fetchMock);

	vi.resetModules();
	const tmdb = await import("#/features/mediaItemSearch/api/tmdb");
	const results = await tmdb.fetchCollectionMovies(COLLECTION_NAME);
	return { results, fetchMock };
}

function collectionSearchResponse(hits: Array<{ id: number; name?: string }>) {
	return jsonResponse({
		results: hits.map(({ id, name }) => ({
			id,
			name: name ?? COLLECTION_NAME,
		})),
	});
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("tmdb.fetchCollectionMovies", () => {
	it("maps each part of the collection to a result", async () => {
		const { results } = await fetchCollectionMoviesWith([
			collectionSearchResponse([{ id: 119 }]),
			jsonResponse({
				parts: [
					MOVIE_PART,
					{ ...MOVIE_PART, id: 121, title: "The Two Towers" },
				],
			}),
		]);

		expect(results).toHaveLength(2);
		expect(results[0]).toMatchObject({
			externalId: "120",
			externalSource: "tmdb",
			type: MediaItemType.MOVIE,
			title: "The Fellowship of the Ring",
			releaseDate: "2001-12-19",
		});
		expect(results[1]?.externalId).toBe("121");
	});

	it("fetches the detail for the matched collection", async () => {
		const { fetchMock } = await fetchCollectionMoviesWith([
			collectionSearchResponse([{ id: 119 }, { id: 999 }]),
			jsonResponse({ parts: [MOVIE_PART] }),
		]);

		expect(fetchMock.mock.calls[1]?.[0]).toContain("/3/collection/119");
		expect(fetchMock.mock.calls[1]?.[0]).not.toContain("/3/collection/999");
	});

	/**
	 * TMDB really does rank "The Making of The Lord of the Rings Collection"
	 * above the exact match when handed its own collection name, so taking the
	 * top hit would surface the documentaries instead of the films.
	 */
	it("prefers an exact name match over a higher-ranked near miss", async () => {
		const { fetchMock } = await fetchCollectionMoviesWith([
			collectionSearchResponse([
				{ id: 1173608, name: `The Making of ${COLLECTION_NAME}` },
				{ id: 119, name: COLLECTION_NAME },
			]),
			jsonResponse({ parts: [MOVIE_PART] }),
		]);

		expect(fetchMock.mock.calls[1]?.[0]).toContain("/3/collection/119");
	});

	it("matches an exact name regardless of casing", async () => {
		const { fetchMock } = await fetchCollectionMoviesWith([
			collectionSearchResponse([
				{ id: 999, name: "Something Else" },
				{ id: 119, name: COLLECTION_NAME.toUpperCase() },
			]),
			jsonResponse({ parts: [MOVIE_PART] }),
		]);

		expect(fetchMock.mock.calls[1]?.[0]).toContain("/3/collection/119");
	});

	it("falls back to the top hit when no name matches exactly", async () => {
		const { fetchMock } = await fetchCollectionMoviesWith([
			collectionSearchResponse([
				{ id: 777, name: "Mission: Impossible Collection" },
				{ id: 888, name: "Mission: Impossible (Animated) Collection" },
			]),
			jsonResponse({ parts: [MOVIE_PART] }),
		]);

		expect(fetchMock.mock.calls[1]?.[0]).toContain("/3/collection/777");
	});

	it("builds a w500 poster URL", async () => {
		const { results } = await fetchCollectionMoviesWith([
			collectionSearchResponse([{ id: 119 }]),
			jsonResponse({ parts: [MOVIE_PART] }),
		]);

		expect(results[0]?.coverImageUrl).toBe(
			"https://image.tmdb.org/t/p/w500/abc.jpg",
		);
	});

	it("carries the collection name through as the series metadata", async () => {
		const { results } = await fetchCollectionMoviesWith([
			collectionSearchResponse([{ id: 119 }]),
			jsonResponse({ parts: [MOVIE_PART] }),
		]);

		expect(results[0]?.metadata).toEqual({ series: COLLECTION_NAME });
	});

	it("returns nothing and skips the detail call when the search fails", async () => {
		const { results, fetchMock } = await fetchCollectionMoviesWith([
			jsonResponse({}, { ok: false }),
		]);

		expect(results).toEqual([]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("returns nothing and skips the detail call when the search has no hits", async () => {
		const { results, fetchMock } = await fetchCollectionMoviesWith([
			collectionSearchResponse([]),
		]);

		expect(results).toEqual([]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("returns nothing when the collection detail fails", async () => {
		const { results } = await fetchCollectionMoviesWith([
			collectionSearchResponse([{ id: 119 }]),
			jsonResponse({}, { ok: false }),
		]);

		expect(results).toEqual([]);
	});

	it("returns nothing when the collection has no parts", async () => {
		const { results } = await fetchCollectionMoviesWith([
			collectionSearchResponse([{ id: 119 }]),
			jsonResponse({}),
		]);

		expect(results).toEqual([]);
	});

	it("returns nothing when fetch rejects", async () => {
		vi.stubEnv("TMDB_API_KEY", "test-key");
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

		vi.resetModules();
		const tmdb = await import("#/features/mediaItemSearch/api/tmdb");

		await expect(tmdb.fetchCollectionMovies(COLLECTION_NAME)).resolves.toEqual(
			[],
		);
	});

	// getApiKey() throws when the key is unset, which the catch must absorb.
	it("returns nothing when the API key is missing", async () => {
		const { results, fetchMock } = await fetchCollectionMoviesWith([], {
			hasApiKey: false,
		});

		expect(results).toEqual([]);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("leaves the cover unset for a part with no poster", async () => {
		const { results } = await fetchCollectionMoviesWith([
			collectionSearchResponse([{ id: 119 }]),
			jsonResponse({ parts: [{ ...MOVIE_PART, poster_path: undefined }] }),
		]);

		expect(results[0]?.coverImageUrl).toBeUndefined();
	});
});
