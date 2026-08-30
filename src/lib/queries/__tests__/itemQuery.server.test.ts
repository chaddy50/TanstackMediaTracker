import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";
import { REORDERABLE_ITEM_LIMIT } from "#/lib/queries/types";
import {
	normalizeSortField,
	runItemQuery,
	runItemStatsQuery,
	runOrderableItemQuery,
	transitionReleasedItems,
} from "../itemQuery.server";

vi.mock("#/database/index", () => ({ db: {} }));
vi.mock("#/features/screens/auth", () => ({ auth: {} }));
vi.mock("#/features/screens/auth/session", () => ({
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
		const { db } = await import("#/database/index");
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

		const { db } = await import("#/database/index");

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
function makeItemQueryChain(resolvedRows: (typeof baseRow)[]) {
	const chain: Record<string, unknown> = {};
	for (const method of [
		"from",
		"innerJoin",
		"leftJoin",
		"where",
		"orderBy",
		"limit",
	]) {
		chain[method] = vi.fn(() => chain);
	}
	chain.offset = vi.fn().mockResolvedValue(resolvedRows);
	return chain;
}

/**
 * A chain for the unpaginated query, which stops at `.limit()`. That call has to
 * be both awaitable (it terminates `runOrderableItemQuery`) and chainable
 * (`runItemQuery` still hangs `.offset()` off it), so it returns a thenable.
 */
function makeOrderableQueryChain(resolvedRows: (typeof baseRow)[]) {
	const chain: Record<string, unknown> = {};
	for (const method of ["from", "innerJoin", "leftJoin", "where", "orderBy"]) {
		chain[method] = vi.fn(() => chain);
	}
	const offsetFn = vi.fn().mockResolvedValue(resolvedRows);
	// A real promise, so awaiting it works, with `offset` hung off it so the
	// paginated caller can keep chaining.
	const limitFn = vi.fn(() =>
		Object.assign(Promise.resolve(resolvedRows), { offset: offsetFn }),
	);
	chain.limit = limitFn;
	return { chain, limitFn, offsetFn };
}

describe("runItemQuery — pagination", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it("sets hasMore to true and returns exactly PAGE_SIZE items when DB yields PAGE_SIZE+1 rows", async () => {
		const { db } = await import("#/database/index");
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
		const { db } = await import("#/database/index");
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
		const { db } = await import("#/database/index");
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
		const { db } = await import("#/database/index");
		const chain = makeItemQueryChain([{ ...baseRow, latestRating: "4.5" }]);
		// @ts-expect-error — assigning to mocked module
		db.select = vi.fn(() => chain);

		const result = await runItemQuery({}, "user-1");

		expect(result.items[0].rating).toBe(4.5);
	});

	it("defaults rating to 0 when latestRating is null", async () => {
		const { db } = await import("#/database/index");
		const chain = makeItemQueryChain([{ ...baseRow, latestRating: null }]);
		// @ts-expect-error — assigning to mocked module
		db.select = vi.fn(() => chain);

		const result = await runItemQuery({}, "user-1");

		expect(result.items[0].rating).toBe(0);
	});

	it("still paginates correctly when a view id is supplied", async () => {
		const { db } = await import("#/database/index");
		const rows = Array.from({ length: PAGE_SIZE + 1 }, (_, index) => ({
			...baseRow,
			id: index + 1,
		}));
		const chain = makeItemQueryChain(rows);
		// @ts-expect-error — assigning to mocked module
		db.select = vi.fn(() => chain);

		const result = await runItemQuery({ sortBy: "custom" }, "user-1", 0, 7);

		expect(result.hasMore).toBe(true);
		expect(result.items).toHaveLength(PAGE_SIZE);
	});

	it("returns the paginated shape for custom order with no view id", async () => {
		const { db } = await import("#/database/index");
		const chain = makeItemQueryChain([baseRow]);
		// @ts-expect-error — assigning to mocked module
		db.select = vi.fn(() => chain);

		const result = await runItemQuery({ sortBy: "custom" }, "user-1");

		expect(result).toEqual({
			items: expect.any(Array),
			hasMore: false,
		});
		expect(chain.orderBy).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// runOrderableItemQuery
// ---------------------------------------------------------------------------

describe("runOrderableItemQuery", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it("caps the fetch at the reorderable item limit", async () => {
		const { db } = await import("#/database/index");
		const { chain, limitFn } = makeOrderableQueryChain([baseRow]);
		// @ts-expect-error — assigning to mocked module
		db.select = vi.fn(() => chain);

		await runOrderableItemQuery({ sortBy: "custom" }, "user-1", 7);

		expect(limitFn).toHaveBeenCalledWith(REORDERABLE_ITEM_LIMIT);
	});

	it("does not paginate", async () => {
		const { db } = await import("#/database/index");
		const { chain, offsetFn } = makeOrderableQueryChain([baseRow]);
		// @ts-expect-error — assigning to mocked module
		db.select = vi.fn(() => chain);

		const result = await runOrderableItemQuery(
			{ sortBy: "custom" },
			"user-1",
			7,
		);

		expect(offsetFn).not.toHaveBeenCalled();
		expect(Array.isArray(result)).toBe(true);
		expect(result).not.toHaveProperty("hasMore");
	});

	it("converts latestRating string to a number on each item", async () => {
		const { db } = await import("#/database/index");
		const { chain } = makeOrderableQueryChain([
			{ ...baseRow, latestRating: "4.5" },
		]);
		// @ts-expect-error — assigning to mocked module
		db.select = vi.fn(() => chain);

		const result = await runOrderableItemQuery(
			{ sortBy: "custom" },
			"user-1",
			7,
		);

		expect(result[0].rating).toBe(4.5);
	});

	it("defaults rating to 0 when latestRating is null", async () => {
		const { db } = await import("#/database/index");
		const { chain } = makeOrderableQueryChain([
			{ ...baseRow, latestRating: null },
		]);
		// @ts-expect-error — assigning to mocked module
		db.select = vi.fn(() => chain);

		const result = await runOrderableItemQuery(
			{ sortBy: "custom" },
			"user-1",
			7,
		);

		expect(result[0].rating).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// runItemStatsQuery
// ---------------------------------------------------------------------------

/** The raw aggregate row Postgres hands back: bigint counts arrive as strings. */
type StatsQueryRow = {
	totalCount: string;
	completedCount: string;
	purchasedCount: string;
	droppedCount: string;
	averageRating: string | null;
};

/**
 * The aggregate select terminates at `.where()` rather than at `.offset()`, so
 * it needs its own chain. `limit`/`offset` are present purely so a test can
 * assert the aggregate never paginates.
 */
function makeStatsQueryChain(resolvedRow: StatsQueryRow) {
	const chain: Record<string, unknown> = {};
	for (const method of ["from", "leftJoin"]) {
		chain[method] = vi.fn(() => chain);
	}
	chain.where = vi.fn().mockResolvedValue([resolvedRow]);
	const limitFn = vi.fn(() => chain);
	const offsetFn = vi.fn(() => chain);
	chain.limit = limitFn;
	chain.offset = offsetFn;
	return { chain, limitFn, offsetFn };
}

describe("runItemStatsQuery", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it("coerces bigint counts returned as strings into numbers", async () => {
		const { db } = await import("#/database/index");
		const { chain } = makeStatsQueryChain({
			totalCount: "10",
			completedCount: "4",
			purchasedCount: "6",
			droppedCount: "1",
			averageRating: "4.25",
		});
		// @ts-expect-error — assigning to mocked module
		db.select = vi.fn(() => chain);

		const stats = await runItemStatsQuery({}, "user-1");

		// The average is parsed separately below: it is the one field allowed to
		// come back null, so "every value is a number" is no longer the invariant.
		for (const count of [
			stats.totalCount,
			stats.completedCount,
			stats.purchasedCount,
			stats.droppedCount,
		]) {
			expect(count).toBeTypeOf("number");
		}
		expect(stats.totalCount).toBe(10);
		expect(stats.completedCount).toBe(4);
		expect(stats.purchasedCount).toBe(6);
		expect(stats.droppedCount).toBe(1);
		expect(stats.averageRating).toBe(4.25);
	});

	it("coerces a zero row to numeric zeros, not string zeros", async () => {
		const { db } = await import("#/database/index");
		const { chain } = makeStatsQueryChain({
			totalCount: "0",
			completedCount: "0",
			purchasedCount: "0",
			droppedCount: "0",
			// Postgres returns null from avg() when no row satisfied the filter.
			averageRating: null,
		});
		// @ts-expect-error — assigning to mocked module
		db.select = vi.fn(() => chain);

		const stats = await runItemStatsQuery({}, "user-1");

		expect(stats).toEqual({
			totalCount: 0,
			completedCount: 0,
			purchasedCount: 0,
			droppedCount: 0,
			averageRating: null,
		});
		for (const count of [
			stats.totalCount,
			stats.completedCount,
			stats.purchasedCount,
			stats.droppedCount,
		]) {
			expect(count).toBeTypeOf("number");
		}
	});

	// `toCount` would turn this into 0, which the bar would render as `0.0 ★`.
	it("keeps a null average null rather than coercing it to 0", async () => {
		const { db } = await import("#/database/index");
		const { chain } = makeStatsQueryChain({
			totalCount: "10",
			completedCount: "4",
			purchasedCount: "6",
			droppedCount: "1",
			averageRating: null,
		});
		// @ts-expect-error — assigning to mocked module
		db.select = vi.fn(() => chain);

		const stats = await runItemStatsQuery({}, "user-1");

		expect(stats.averageRating).toBeNull();
	});

	it("reports a genuine average of 0 as 0, not null", async () => {
		const { db } = await import("#/database/index");
		const { chain } = makeStatsQueryChain({
			totalCount: "10",
			completedCount: "4",
			purchasedCount: "6",
			droppedCount: "1",
			averageRating: "0",
		});
		// @ts-expect-error — assigning to mocked module
		db.select = vi.fn(() => chain);

		const stats = await runItemStatsQuery({}, "user-1");

		expect(stats.averageRating).toBe(0);
	});

	it("issues one un-paginated aggregate rather than a page of rows", async () => {
		const { db } = await import("#/database/index");
		const { chain, limitFn, offsetFn } = makeStatsQueryChain({
			totalCount: "10",
			completedCount: "4",
			purchasedCount: "6",
			droppedCount: "1",
			averageRating: "4.0",
		});
		const selectFn = vi.fn(() => chain);
		// @ts-expect-error — assigning to mocked module
		db.select = selectFn;

		await runItemStatsQuery({}, "user-1");

		expect(selectFn).toHaveBeenCalledOnce();
		expect(limitFn).not.toHaveBeenCalled();
		expect(offsetFn).not.toHaveBeenCalled();
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
		const fields = [
			"title",
			"updatedAt",
			"status",
			"creator",
			"director",
			"series",
			"rating",
			"completedAt",
			"releaseDate",
			"custom",
		] as const;
		for (const field of fields) {
			expect(normalizeSortField(field)).toBe(field);
		}
	});

	it('passes "custom" through', () => {
		expect(normalizeSortField("custom")).toBe("custom");
	});
});
