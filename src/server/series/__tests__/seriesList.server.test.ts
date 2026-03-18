import { describe, expect, it, vi } from "vitest";

import { MediaItemStatus, PurchaseStatus } from "#/lib/enums";
import { findNextSeriesItem } from "../seriesList.server";

vi.mock("#/db/index", () => ({ db: {} }));
vi.mock("#/lib/auth", () => ({ auth: {} }));
vi.mock("#/lib/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

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
