import { describe, expect, it } from "vitest";

import { filterAndSortOptionsSchema } from "#/lib/filterAndSort";
import { ITEM_SORT_FIELDS, SERIES_SORT_FIELDS } from "#/lib/sortFields";

describe("filterAndSortOptionsSchema sortBy", () => {
	it('accepts "releaseDate"', () => {
		const parsed = filterAndSortOptionsSchema.parse({ sortBy: "releaseDate" });
		expect(parsed.sortBy).toBe("releaseDate");
	});

	it("accepts every item sort field", () => {
		for (const field of ITEM_SORT_FIELDS) {
			expect(
				filterAndSortOptionsSchema.safeParse({ sortBy: field }).success,
			).toBe(true);
		}
	});

	it("accepts every series sort field", () => {
		for (const field of SERIES_SORT_FIELDS) {
			expect(
				filterAndSortOptionsSchema.safeParse({ sortBy: field }).success,
			).toBe(true);
		}
	});

	it("rejects an unknown sort field", () => {
		expect(
			filterAndSortOptionsSchema.safeParse({ sortBy: "bogus" }).success,
		).toBe(false);
	});

	it("round-trips a saved view's filters using the release date sort", () => {
		const filters = {
			mediaTypes: ["book"],
			statuses: ["done"],
			sortBy: "releaseDate",
			sortDirection: "desc",
		};

		expect(filterAndSortOptionsSchema.parse(filters)).toEqual(filters);
	});
});
