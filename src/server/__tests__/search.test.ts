import { describe, expect, it } from "vitest";
import { MediaItemStatus } from "#/lib/enums";
import type { ExternalSearchResult } from "#/lib/api/types";
import { attachLibraryStatus, collectApiResults } from "../search";

const baseResult: ExternalSearchResult = {
	externalId: "42",
	externalSource: "tmdb",
	type: "movie",
	title: "Dune",
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
