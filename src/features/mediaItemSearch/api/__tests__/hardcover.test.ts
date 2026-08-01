import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExternalSearchResult } from "#/features/mediaItemSearch/api/types";

type SearchHitDocument = {
	id: string;
	title: string;
	release_year?: number;
};

function mockGraphqlResponse(data: unknown) {
	return { status: 200, ok: true, json: async () => ({ data }) };
}

/**
 * The Hardcover client reads its API key at module load and issues two calls
 * (keyword search, then cover images), so each run needs a fresh module.
 */
async function searchWithHit(
	document: SearchHitDocument,
): Promise<ExternalSearchResult[]> {
	vi.stubEnv("HARDCOVER_API_KEY", "Bearer test-key");
	vi.stubGlobal(
		"fetch",
		vi
			.fn()
			.mockResolvedValueOnce(
				mockGraphqlResponse({ search: { results: { hits: [{ document }] } } }),
			)
			.mockResolvedValueOnce(mockGraphqlResponse({ books: [] })),
	);

	vi.resetModules();
	const hardcover = await import("#/features/mediaItemSearch/api/hardcover");
	return hardcover.search("gilgamesh");
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("hardcover.search", () => {
	it("converts a pre-0 CE release year into a storable date", async () => {
		const [result] = await searchWithHit({
			id: "785115",
			title: "The Epic of Gilgamesh",
			release_year: -1200,
		});

		expect(result?.releaseDate).toBe("1200-01-01 BC");
	});

	it("converts a CE release year into a plain date", async () => {
		const [result] = await searchWithHit({
			id: "551643",
			title: "The Iliad",
			release_year: 2020,
		});

		expect(result?.releaseDate).toBe("2020-01-01");
	});

	it("leaves the release date unset when the year is missing", async () => {
		const [result] = await searchWithHit({
			id: "1770381",
			title: "The Iliad:",
		});

		expect(result?.releaseDate).toBeUndefined();
	});
});
