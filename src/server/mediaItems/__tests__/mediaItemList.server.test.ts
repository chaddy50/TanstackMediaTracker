import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";
import {
	normalizeSortField,
	runItemQuery,
	transitionReleasedItems,
} from "../mediaItemList.server";

vi.mock("#/db/index", () => ({ db: {} }));
vi.mock("#/lib/auth", () => ({ auth: {} }));
vi.mock("#/lib/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

// ---------------------------------------------------------------------------
// transitionReleasedItems (DB-mocked)
// ---------------------------------------------------------------------------

// Build a chainable Drizzle-style mock that resolves to `resolvedValue` at
// the end of the chain: db.select().from().where()
function makeSelectMock(resolvedValue: unknown) {
	const whereFn = vi.fn().mockResolvedValue(resolvedValue);
	const fromFn = vi.fn(() => ({ where: whereFn }));
	const selectFn = vi.fn(() => ({ from: fromFn }));
	return { selectFn, fromFn, whereFn };
}

// Build a chainable mock for db.update().set().where()
function makeUpdateMock() {
	const whereFn = vi.fn().mockResolvedValue(undefined);
	const setFn = vi.fn(() => ({ where: whereFn }));
	const updateFn = vi.fn(() => ({ set: setFn }));
	return { updateFn, setFn, whereFn };
}

describe("transitionReleasedItems", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.resetAllMocks();
	});

	it("returns early without calling update when no expired items are found", async () => {
		const { db } = await import("#/db/index");
		const { selectFn } = makeSelectMock([]);
		// @ts-expect-error — assigning to mocked module
		db.select = selectFn;
		const updateFn = vi.fn();
		db.update = updateFn;

		vi.setSystemTime(new Date("2025-06-01"));
		await transitionReleasedItems("user-1");

		expect(updateFn).not.toHaveBeenCalled();
	});

	it("calls update with the IDs of expired items when they exist", async () => {
		const expiredItems = [
			{ id: 10, seriesId: null },
			{ id: 20, seriesId: null },
		];

		const { db } = await import("#/db/index");

		// First select → returns expired items; second select (inside syncSeriesStatus) never reached because seriesId is null
		const { selectFn } = makeSelectMock(expiredItems);
		// @ts-expect-error — assigning to mocked module
		db.select = selectFn;

		const { updateFn, whereFn } = makeUpdateMock();
		// @ts-expect-error — assigning to mocked module
		db.update = updateFn;

		vi.setSystemTime(new Date("2025-06-01"));
		await transitionReleasedItems("user-1");

		expect(updateFn).toHaveBeenCalledOnce();
		// The update's where clause receives the list of expired IDs via inArray — verify set() was called with BACKLOG status
		expect(updateFn().set).toHaveBeenCalledWith(
			expect.objectContaining({ status: MediaItemStatus.BACKLOG }),
		);
		// where() was called (the exact Drizzle expression is opaque, just verify it ran)
		expect(whereFn).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// runItemQuery — pagination (pure JS logic, no real DB needed)
// ---------------------------------------------------------------------------

// PAGE_SIZE is 48 (defined in mediaItemQueries.ts). The function fetches PAGE_SIZE+1
// rows, sets hasMore=true if the extra row is present, then slices back to PAGE_SIZE.
const PAGE_SIZE = 48;

const baseRow = {
	id: 1,
	status: MediaItemStatus.BACKLOG,
	purchaseStatus: PurchaseStatus.NOT_PURCHASED,
	expectedReleaseDate: null,
	mediaItemId: 1,
	title: "Test",
	type: MediaItemType.BOOK,
	coverImageUrl: null,
	seriesId: null,
	seriesName: null,
	creatorId: null,
	creatorName: null,
	genreId: null,
	genreName: null,
	latestRating: null as string | null,
	completedAt: null,
};

// Builds a fully chainable Drizzle-style mock. All intermediate methods (from,
// innerJoin, leftJoin, where, orderBy, limit) return the same chain object so
// that any number of chained calls works. The terminal `.offset()` resolves
// with the supplied rows.
function makeItemQueryChain(resolvedRows: typeof baseRow[]) {
	const chain: Record<string, unknown> = {};
	for (const method of ["from", "innerJoin", "leftJoin", "where", "orderBy", "limit"]) {
		chain[method] = vi.fn(() => chain);
	}
	chain.offset = vi.fn().mockResolvedValue(resolvedRows);
	return chain;
}

describe("runItemQuery — pagination", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it("sets hasMore to true and returns exactly PAGE_SIZE items when DB yields PAGE_SIZE+1 rows", async () => {
		const { db } = await import("#/db/index");
		const rows = Array.from({ length: PAGE_SIZE + 1 }, (_, index) => ({
			...baseRow,
			id: index + 1,
		}));
		const chain = makeItemQueryChain(rows);
		// @ts-expect-error — assigning to mocked module
		db.select = vi.fn(() => chain);

		const result = await runItemQuery({}, "user-1");

		expect(result.hasMore).toBe(true);
		expect(result.items).toHaveLength(PAGE_SIZE);
	});

	it("sets hasMore to false when DB yields exactly PAGE_SIZE rows", async () => {
		const { db } = await import("#/db/index");
		const rows = Array.from({ length: PAGE_SIZE }, (_, index) => ({
			...baseRow,
			id: index + 1,
		}));
		const chain = makeItemQueryChain(rows);
		// @ts-expect-error — assigning to mocked module
		db.select = vi.fn(() => chain);

		const result = await runItemQuery({}, "user-1");

		expect(result.hasMore).toBe(false);
		expect(result.items).toHaveLength(PAGE_SIZE);
	});

	it("sets hasMore to false and returns all items when DB yields fewer than PAGE_SIZE rows", async () => {
		const { db } = await import("#/db/index");
		const rows = Array.from({ length: 5 }, (_, index) => ({
			...baseRow,
			id: index + 1,
		}));
		const chain = makeItemQueryChain(rows);
		// @ts-expect-error — assigning to mocked module
		db.select = vi.fn(() => chain);

		const result = await runItemQuery({}, "user-1");

		expect(result.hasMore).toBe(false);
		expect(result.items).toHaveLength(5);
	});

	it("converts latestRating string to a number on each item", async () => {
		const { db } = await import("#/db/index");
		const chain = makeItemQueryChain([{ ...baseRow, latestRating: "4.5" }]);
		// @ts-expect-error — assigning to mocked module
		db.select = vi.fn(() => chain);

		const result = await runItemQuery({}, "user-1");

		expect(result.items[0].rating).toBe(4.5);
	});

	it("defaults rating to 0 when latestRating is null", async () => {
		const { db } = await import("#/db/index");
		const chain = makeItemQueryChain([{ ...baseRow, latestRating: null }]);
		// @ts-expect-error — assigning to mocked module
		db.select = vi.fn(() => chain);

		const result = await runItemQuery({}, "user-1");

		expect(result.items[0].rating).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// normalizeSortField
// ---------------------------------------------------------------------------

describe("normalizeSortField", () => {
	it('maps legacy "author" to "creator"', () => {
		expect(normalizeSortField("author")).toBe("creator");
	});

	it('defaults to "series" when undefined', () => {
		expect(normalizeSortField(undefined)).toBe("series");
	});

	it("passes through all other valid sort fields unchanged", () => {
		const fields = ["title", "updatedAt", "status", "creator", "director", "series", "rating", "completedAt"] as const;
		for (const field of fields) {
			expect(normalizeSortField(field)).toBe(field);
		}
	});
});
