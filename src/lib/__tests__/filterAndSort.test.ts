import { describe, expect, it } from "vitest";

import { MediaItemStatus, PurchaseStatus } from "#/lib/enums";
import {
	filterAndSortOptionsSchema,
	isFilteredToSinglePurchaseStatus,
	isFilteredToSingleStatus,
} from "#/lib/filterAndSort";
import {
	ITEM_SORT_FIELDS,
	SERIES_SORT_FIELDS,
	VIEW_ITEM_SORT_FIELDS,
} from "#/lib/sortFields";

describe("filterAndSortOptionsSchema sortBy", () => {
	it('accepts "releaseDate"', () => {
		const parsed = filterAndSortOptionsSchema.parse({ sortBy: "releaseDate" });
		expect(parsed.sortBy).toBe("releaseDate");
	});

	it('accepts "custom"', () => {
		expect(
			filterAndSortOptionsSchema.safeParse({ sortBy: "custom" }).success,
		).toBe(true);
	});

	it("accepts every view item sort field", () => {
		for (const field of VIEW_ITEM_SORT_FIELDS) {
			expect(
				filterAndSortOptionsSchema.safeParse({ sortBy: field }).success,
			).toBe(true);
		}
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

	it('rejects "manual", which is not the custom order field', () => {
		expect(
			filterAndSortOptionsSchema.safeParse({ sortBy: "manual" }).success,
		).toBe(false);
	});

	it("round-trips a saved view's filters using custom order", () => {
		const filters = {
			tags: ["Ancient Sumeria"],
			sortBy: "custom",
			sortDirection: "asc",
		};

		expect(filterAndSortOptionsSchema.parse(filters)).toEqual(filters);
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

describe("isFilteredToSingleStatus", () => {
	it("is false when no status filter is set", () => {
		expect(isFilteredToSingleStatus(undefined)).toBe(false);
	});

	it("is false when the status filter is null", () => {
		expect(isFilteredToSingleStatus(null)).toBe(false);
	});

	it("is false when the status filter is empty", () => {
		expect(isFilteredToSingleStatus([])).toBe(false);
	});

	it("is true when pinned to in progress", () => {
		expect(isFilteredToSingleStatus([MediaItemStatus.IN_PROGRESS])).toBe(true);
	});

	// The rule is "exactly one status", independent of which one.
	it("is true when pinned to backlog", () => {
		expect(isFilteredToSingleStatus([MediaItemStatus.BACKLOG])).toBe(true);
	});

	it("is false when two statuses are selected", () => {
		expect(
			isFilteredToSingleStatus([
				MediaItemStatus.IN_PROGRESS,
				MediaItemStatus.ON_HOLD,
			]),
		).toBe(false);
	});

	it("is false when every status is selected", () => {
		expect(isFilteredToSingleStatus(Object.values(MediaItemStatus))).toBe(
			false,
		);
	});
});
