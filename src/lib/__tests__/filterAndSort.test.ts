import { describe, expect, it } from "vitest";

import { MediaItemStatus, PurchaseStatus } from "#/lib/enums";
import {
	filterAndSortOptionsSchema,
	isFilteredToCompletedOnly,
	isFilteredToSinglePurchaseStatus,
	isFilteredToSingleStatus,
	shouldShowCompletedCount,
	shouldShowDroppedCount,
	shouldShowPurchasedCount,
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

describe("isFilteredToCompletedOnly", () => {
	it("is false when no status filter is set", () => {
		expect(isFilteredToCompletedOnly(undefined)).toBe(false);
	});

	it("is false when the status filter is null", () => {
		expect(isFilteredToCompletedOnly(null)).toBe(false);
	});

	it("is false when the status filter is empty", () => {
		expect(isFilteredToCompletedOnly([])).toBe(false);
	});

	it("is true when pinned to completed", () => {
		expect(isFilteredToCompletedOnly([MediaItemStatus.COMPLETED])).toBe(true);
	});

	it("is false when pinned to another single status", () => {
		expect(isFilteredToCompletedOnly([MediaItemStatus.DROPPED])).toBe(false);
	});

	it("is false when completed is selected alongside another status", () => {
		expect(
			isFilteredToCompletedOnly([
				MediaItemStatus.COMPLETED,
				MediaItemStatus.DROPPED,
			]),
		).toBe(false);
	});
});

describe("shouldShowCompletedCount", () => {
	it("is true when no status filter is set", () => {
		expect(shouldShowCompletedCount(undefined)).toBe(true);
	});

	it("is true when the status filter is null", () => {
		expect(shouldShowCompletedCount(null)).toBe(true);
	});

	it("is true when the status filter is empty", () => {
		expect(shouldShowCompletedCount([])).toBe(true);
	});

	// Every item in the view is completed, so the count is just the total again.
	it("is false when pinned to completed", () => {
		expect(shouldShowCompletedCount([MediaItemStatus.COMPLETED])).toBe(false);
	});

	// The count can only ever be zero.
	it("is false when the filter leaves completed out", () => {
		expect(
			shouldShowCompletedCount([
				MediaItemStatus.BACKLOG,
				MediaItemStatus.IN_PROGRESS,
			]),
		).toBe(false);
	});

	it("is true when completed is one of several selected statuses", () => {
		expect(
			shouldShowCompletedCount([
				MediaItemStatus.COMPLETED,
				MediaItemStatus.IN_PROGRESS,
			]),
		).toBe(true);
	});

	it("is true when every status is selected", () => {
		expect(shouldShowCompletedCount(Object.values(MediaItemStatus))).toBe(true);
	});
});

describe("shouldShowDroppedCount", () => {
	it("is true when no status filter is set", () => {
		expect(shouldShowDroppedCount(undefined)).toBe(true);
	});

	it("is false when pinned to dropped", () => {
		expect(shouldShowDroppedCount([MediaItemStatus.DROPPED])).toBe(false);
	});

	it("is false when the filter leaves dropped out", () => {
		expect(shouldShowDroppedCount([MediaItemStatus.COMPLETED])).toBe(false);
	});

	it("is true when dropped is one of several selected statuses", () => {
		expect(
			shouldShowDroppedCount([
				MediaItemStatus.DROPPED,
				MediaItemStatus.COMPLETED,
			]),
		).toBe(true);
	});
});

describe("shouldShowPurchasedCount", () => {
	it("is true when no purchase filter is set", () => {
		expect(shouldShowPurchasedCount(undefined)).toBe(true);
	});

	it("is true when the purchase filter is null", () => {
		expect(shouldShowPurchasedCount(null)).toBe(true);
	});

	it("is true when the purchase filter is empty", () => {
		expect(shouldShowPurchasedCount([])).toBe(true);
	});

	it("is false when pinned to purchased", () => {
		expect(shouldShowPurchasedCount([PurchaseStatus.PURCHASED])).toBe(false);
	});

	it("is false when pinned to a status that is not purchased", () => {
		expect(shouldShowPurchasedCount([PurchaseStatus.WANT_TO_BUY])).toBe(false);
	});

	it("is true when purchased is one of several selected statuses", () => {
		expect(
			shouldShowPurchasedCount([
				PurchaseStatus.PURCHASED,
				PurchaseStatus.WANT_TO_BUY,
			]),
		).toBe(true);
	});

	it("is true when every purchase status is selected", () => {
		expect(shouldShowPurchasedCount(Object.values(PurchaseStatus))).toBe(true);
	});
});
