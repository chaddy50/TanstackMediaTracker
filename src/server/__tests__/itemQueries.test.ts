import { MediaItemStatus, PurchaseStatus } from "#/lib/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	findNextSeriesItem,
	inferSeriesStatus,
	transitionReleasedItems,
} from "../itemQueries";

// ---------------------------------------------------------------------------
// inferSeriesStatus
// ---------------------------------------------------------------------------

describe("inferSeriesStatus", () => {
	it("returns null for an empty statuses array", () => {
		expect(inferSeriesStatus([])).toBeNull();
	});

	it("returns IN_PROGRESS when any item is in progress", () => {
		expect(
			inferSeriesStatus([
				MediaItemStatus.IN_PROGRESS,
				MediaItemStatus.COMPLETED,
				MediaItemStatus.BACKLOG,
			]),
		).toBe(MediaItemStatus.IN_PROGRESS);
	});

	it("IN_PROGRESS takes priority over all other conditions", () => {
		// Even if all others are done, an in-progress item wins
		expect(
			inferSeriesStatus([
				MediaItemStatus.IN_PROGRESS,
				MediaItemStatus.COMPLETED,
				MediaItemStatus.DROPPED,
			]),
		).toBe(MediaItemStatus.IN_PROGRESS);
	});

	it("returns COMPLETED when every item is COMPLETED", () => {
		expect(
			inferSeriesStatus([MediaItemStatus.COMPLETED, MediaItemStatus.COMPLETED]),
		).toBe(MediaItemStatus.COMPLETED);
	});

	it("returns DROPPED when every item is DROPPED", () => {
		expect(
			inferSeriesStatus([MediaItemStatus.DROPPED, MediaItemStatus.DROPPED]),
		).toBe(MediaItemStatus.DROPPED);
	});

	it("returns DROPPED when remaining items are all DROPPED (some completed, rest dropped)", () => {
		expect(
			inferSeriesStatus([
				MediaItemStatus.COMPLETED,
				MediaItemStatus.DROPPED,
				MediaItemStatus.DROPPED,
			]),
		).toBe(MediaItemStatus.DROPPED);
	});

	it("returns WAITING_FOR_NEXT_RELEASE when all non-done items are waiting", () => {
		expect(
			inferSeriesStatus([
				MediaItemStatus.COMPLETED,
				MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
				MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
			]),
		).toBe(MediaItemStatus.WAITING_FOR_NEXT_RELEASE);
	});

	it("returns IN_PROGRESS when justCompleted and remaining items are BACKLOG", () => {
		expect(
			inferSeriesStatus(
				[MediaItemStatus.COMPLETED, MediaItemStatus.BACKLOG],
				true,
			),
		).toBe(MediaItemStatus.IN_PROGRESS);
	});

	it("returns null when not justCompleted and remaining items are BACKLOG", () => {
		expect(
			inferSeriesStatus(
				[MediaItemStatus.COMPLETED, MediaItemStatus.BACKLOG],
				false,
			),
		).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// findNextSeriesItem
// ---------------------------------------------------------------------------

function makeItem(
	id: number,
	status: MediaItemStatus,
): { id: number; status: MediaItemStatus; purchaseStatus: string } {
	return { id, status, purchaseStatus: PurchaseStatus.NOT_PURCHASED };
}

describe("findNextSeriesItem", () => {
	it("returns null for an empty list", () => {
		expect(findNextSeriesItem([])).toBeNull();
	});

	it("returns the first item when all items are BACKLOG (series not started)", () => {
		const items = [
			makeItem(1, MediaItemStatus.BACKLOG),
			makeItem(2, MediaItemStatus.BACKLOG),
			makeItem(3, MediaItemStatus.BACKLOG),
		];
		expect(findNextSeriesItem(items)).toMatchObject({ id: 1 });
	});

	it("returns null when all items are COMPLETED (no backlog items remain)", () => {
		const items = [
			makeItem(1, MediaItemStatus.COMPLETED),
			makeItem(2, MediaItemStatus.COMPLETED),
		];
		expect(findNextSeriesItem(items)).toBeNull();
	});

	it("returns null when all items are DROPPED", () => {
		const items = [
			makeItem(1, MediaItemStatus.DROPPED),
			makeItem(2, MediaItemStatus.DROPPED),
		];
		expect(findNextSeriesItem(items)).toBeNull();
	});

	it("returns the backlog item immediately after the last engaged item", () => {
		const items = [
			makeItem(1, MediaItemStatus.COMPLETED),
			makeItem(2, MediaItemStatus.BACKLOG),
		];
		expect(findNextSeriesItem(items)).toMatchObject({ id: 2 });
	});

	it("returns the first backlog after the last engaged when multiple engaged items precede it", () => {
		const items = [
			makeItem(1, MediaItemStatus.COMPLETED),
			makeItem(2, MediaItemStatus.IN_PROGRESS),
			makeItem(3, MediaItemStatus.BACKLOG),
			makeItem(4, MediaItemStatus.BACKLOG),
		];
		// Last engaged is item 2 (IN_PROGRESS); next backlog after it is item 3
		expect(findNextSeriesItem(items)).toMatchObject({ id: 3 });
	});

	it("skips backlog items that appear before the last engaged item", () => {
		const items = [
			makeItem(1, MediaItemStatus.BACKLOG), // before any engagement — should be skipped
			makeItem(2, MediaItemStatus.COMPLETED),
			makeItem(3, MediaItemStatus.BACKLOG), // correct "next" item
		];
		expect(findNextSeriesItem(items)).toMatchObject({ id: 3 });
	});
});

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

vi.mock("#/db/index", () => ({ db: {} }));
// Also mock better-auth so the import of itemQueries doesn't error
vi.mock("#/lib/auth", () => ({ auth: {} }));
vi.mock("#/lib/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

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
