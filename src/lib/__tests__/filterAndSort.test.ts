import { describe, expect, it } from "vitest";

import { PurchaseStatus } from "#/lib/enums";
import {
	filterAndSortOptionsSchema,
	isFilteredToSinglePurchaseStatus,
} from "#/lib/filterAndSort";
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

describe("isFilteredToSinglePurchaseStatus", () => {
	it("is false when no purchase filter is set", () => {
		expect(isFilteredToSinglePurchaseStatus(undefined)).toBe(false);
	});

	it("is false when the purchase filter is null", () => {
		expect(isFilteredToSinglePurchaseStatus(null)).toBe(false);
	});

	it("is false when the purchase filter is empty", () => {
		expect(isFilteredToSinglePurchaseStatus([])).toBe(false);
	});

	it("is true when pinned to purchased", () => {
		expect(isFilteredToSinglePurchaseStatus([PurchaseStatus.PURCHASED])).toBe(
			true,
		);
	});

	// The rule is "exactly one status", not "purchased only".
	it("is true when pinned to want to buy", () => {
		expect(isFilteredToSinglePurchaseStatus([PurchaseStatus.WANT_TO_BUY])).toBe(
			true,
		);
	});

	it("is true when pinned to not purchased", () => {
		expect(
			isFilteredToSinglePurchaseStatus([PurchaseStatus.NOT_PURCHASED]),
		).toBe(true);
	});

	it("is false when two statuses are selected", () => {
		expect(
			isFilteredToSinglePurchaseStatus([
				PurchaseStatus.PURCHASED,
				PurchaseStatus.WANT_TO_BUY,
			]),
		).toBe(false);
	});

	it("is false when every status is selected", () => {
		expect(
			isFilteredToSinglePurchaseStatus(Object.values(PurchaseStatus)),
		).toBe(false);
	});
});
