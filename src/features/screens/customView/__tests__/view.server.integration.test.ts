import { asc, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemType } from "#/lib/enums";
import { runItemQuery } from "#/lib/queries/itemQuery.server";

// Redirect all db calls to the test database.
// vi.mock is hoisted before imports, so the handlers will see testDb.
vi.mock("#/database/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/features/screens/auth", () => ({ auth: {} }));
vi.mock("#/features/screens/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

import {
	type FilterAndSortOptions,
	viewItemOrder,
	views,
} from "#/database/schema";
import { testDb } from "#/tests/integration/db";
import {
	insertMediaItem,
	insertView,
	insertViewItemOrder,
	truncateAll,
} from "#/tests/integration/helpers";
import {
	handleGetViewOrderItems,
	handleReorderViewItems,
} from "../view.server";

const USER_A = "user-a";
const USER_B = "user-b";

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function insertItem(title: string, userId: string = USER_A) {
	return insertMediaItem({ userId, type: MediaItemType.BOOK, title });
}

async function readOrderRows(viewId: number) {
	return testDb
		.select()
		.from(viewItemOrder)
		.where(eq(viewItemOrder.viewId, viewId))
		.orderBy(asc(viewItemOrder.position));
}

// ---------------------------------------------------------------------------
// handleReorderViewItems
// ---------------------------------------------------------------------------

describe("handleReorderViewItems", () => {
	it("writes positions 0..n-1 in the supplied order", async () => {
		const viewId = await insertView({ userId: USER_A });
		const first = await insertItem("First");
		const second = await insertItem("Second");
		const third = await insertItem("Third");

		await handleReorderViewItems(viewId, [third, first, second], USER_A);

		expect(await readOrderRows(viewId)).toEqual([
			{ viewId, mediaItemId: third, position: 0 },
			{ viewId, mediaItemId: first, position: 1 },
			{ viewId, mediaItemId: second, position: 2 },
		]);
	});

	it("replaces every previous row for the view", async () => {
		const viewId = await insertView({ userId: USER_A });
		const first = await insertItem("First");
		const second = await insertItem("Second");
		const third = await insertItem("Third");
		await insertViewItemOrder({ viewId, mediaItemId: first, position: 0 });
		await insertViewItemOrder({ viewId, mediaItemId: second, position: 1 });
		await insertViewItemOrder({ viewId, mediaItemId: third, position: 2 });

		await handleReorderViewItems(viewId, [third, first], USER_A);

		expect(await readOrderRows(viewId)).toEqual([
			{ viewId, mediaItemId: third, position: 0 },
			{ viewId, mediaItemId: first, position: 1 },
		]);
	});

	it("drops the row of an id left out of the new order", async () => {
		const viewId = await insertView({ userId: USER_A });
		const kept = await insertItem("Kept");
		const dropped = await insertItem("Dropped");
		await insertViewItemOrder({ viewId, mediaItemId: dropped, position: 0 });

		await handleReorderViewItems(viewId, [kept], USER_A);

		const rows = await readOrderRows(viewId);
		expect(rows.map((row) => row.mediaItemId)).toEqual([kept]);
	});

	it("rejects a view owned by another user and writes nothing", async () => {
		const viewId = await insertView({ userId: USER_B });
		const itemId = await insertItem("Mine");
		await insertViewItemOrder({ viewId, mediaItemId: itemId, position: 0 });

		await expect(
			handleReorderViewItems(viewId, [itemId], USER_A),
		).rejects.toThrow(`View ${viewId} not found`);

		expect(await readOrderRows(viewId)).toEqual([
			{ viewId, mediaItemId: itemId, position: 0 },
		]);
	});

	it("filters out items owned by another user without leaving a gap", async () => {
		const viewId = await insertView({ userId: USER_A });
		const mineFirst = await insertItem("Mine first");
		const theirs = await insertItem("Theirs", USER_B);
		const mineSecond = await insertItem("Mine second");

		await handleReorderViewItems(
			viewId,
			[mineFirst, theirs, mineSecond],
			USER_A,
		);

		expect(await readOrderRows(viewId)).toEqual([
			{ viewId, mediaItemId: mineFirst, position: 0 },
			{ viewId, mediaItemId: mineSecond, position: 1 },
		]);
	});

	it("filters out ids that do not exist without leaving a gap", async () => {
		const viewId = await insertView({ userId: USER_A });
		const first = await insertItem("First");
		const second = await insertItem("Second");

		await handleReorderViewItems(viewId, [first, 999_999, second], USER_A);

		expect(await readOrderRows(viewId)).toEqual([
			{ viewId, mediaItemId: first, position: 0 },
			{ viewId, mediaItemId: second, position: 1 },
		]);
	});

	it("leaves another view's order rows untouched", async () => {
		const viewA = await insertView({ userId: USER_A, name: "View A" });
		const viewB = await insertView({ userId: USER_A, name: "View B" });
		const first = await insertItem("First");
		const second = await insertItem("Second");
		await insertViewItemOrder({
			viewId: viewB,
			mediaItemId: first,
			position: 0,
		});

		await handleReorderViewItems(viewA, [second, first], USER_A);

		expect(await readOrderRows(viewB)).toEqual([
			{ viewId: viewB, mediaItemId: first, position: 0 },
		]);
	});

	it("clears the view's rows when given an empty list", async () => {
		const viewId = await insertView({ userId: USER_A });
		const itemId = await insertItem("First");
		await insertViewItemOrder({ viewId, mediaItemId: itemId, position: 0 });

		await handleReorderViewItems(viewId, [], USER_A);

		expect(await readOrderRows(viewId)).toEqual([]);
	});

	it("de-dupes repeated ids rather than colliding on the primary key", async () => {
		const viewId = await insertView({ userId: USER_A });
		const first = await insertItem("First");
		const second = await insertItem("Second");

		await handleReorderViewItems(viewId, [first, second, first], USER_A);

		expect(await readOrderRows(viewId)).toEqual([
			{ viewId, mediaItemId: first, position: 0 },
			{ viewId, mediaItemId: second, position: 1 },
		]);
	});
});

// ---------------------------------------------------------------------------
// handleGetViewOrderItems
// ---------------------------------------------------------------------------

describe("handleGetViewOrderItems", () => {
	it("returns the view's items in saved order, unplaced last", async () => {
		const viewId = await insertView({
			userId: USER_A,
			filters: { sortBy: "custom", sortDirection: "asc" },
		});
		const zebra = await insertItem("Zebra");
		const middle = await insertItem("Middle");
		await insertItem("Apple");
		await insertViewItemOrder({ viewId, mediaItemId: zebra, position: 0 });
		await insertViewItemOrder({ viewId, mediaItemId: middle, position: 1 });

		const items = await handleGetViewOrderItems(viewId, USER_A);

		expect(items.map((item) => item.title)).toEqual([
			"Zebra",
			"Middle",
			"Apple",
		]);
	});

	it("rejects a view owned by another user", async () => {
		const viewId = await insertView({ userId: USER_B });

		await expect(handleGetViewOrderItems(viewId, USER_A)).rejects.toThrow(
			`View ${viewId} not found`,
		);
	});

	it("rejects a series view, which cannot be hand-ordered", async () => {
		const viewId = await insertView({ userId: USER_A, subject: "series" });

		await expect(handleGetViewOrderItems(viewId, USER_A)).rejects.toThrow(
			`View ${viewId} is not an item view`,
		);
	});
});

// ---------------------------------------------------------------------------
// Switching a view to custom order
// ---------------------------------------------------------------------------

describe("handleReorderViewItems sort switching", () => {
	/** The view's saved filters, straight from the row. */
	async function readFilters(viewId: number) {
		const [row] = await testDb
			.select({ filters: views.filters })
			.from(views)
			.where(eq(views.id, viewId));
		return row.filters;
	}

	it("switches the view to custom order when an arrangement is saved", async () => {
		const viewId = await insertView({
			userId: USER_A,
			filters: { sortBy: "title", sortDirection: "desc" },
		});
		const itemId = await insertItem("Gilgamesh");

		await handleReorderViewItems(viewId, [itemId], USER_A);

		expect(await readFilters(viewId)).toMatchObject({
			sortBy: "custom",
			// Positions are stored in the order shown, so they only read back as
			// arranged when the sort runs ascending.
			sortDirection: "asc",
		});
	});

	it("leaves the view's other filters untouched", async () => {
		const viewId = await insertView({
			userId: USER_A,
			filters: { tags: ["Ancient Sumeria"], sortBy: "title" },
		});
		const itemId = await insertItem("Gilgamesh");

		await handleReorderViewItems(viewId, [itemId], USER_A);

		expect(await readFilters(viewId)).toMatchObject({
			tags: ["Ancient Sumeria"],
			sortBy: "custom",
		});
	});

	it("leaves an already custom-ordered view's sort alone", async () => {
		const viewId = await insertView({
			userId: USER_A,
			filters: { sortBy: "custom", sortDirection: "desc" },
		});
		const itemId = await insertItem("Gilgamesh");

		await handleReorderViewItems(viewId, [itemId], USER_A);

		expect(await readFilters(viewId)).toMatchObject({
			sortBy: "custom",
			sortDirection: "desc",
		});
	});

	// Opening reorder mode without dragging anything must not rewrite the sort.
	it("is not triggered by merely reading the view's order", async () => {
		const viewId = await insertView({
			userId: USER_A,
			filters: { sortBy: "title", sortDirection: "desc" },
		});
		await insertItem("Gilgamesh");

		await handleGetViewOrderItems(viewId, USER_A);

		expect(await readFilters(viewId)).toMatchObject({
			sortBy: "title",
			sortDirection: "desc",
		});
	});

	// The whole point of the switch: without it the saved positions would be
	// written and then ignored, because the view would still sort by title.
	it("makes the saved arrangement take effect for the view", async () => {
		const viewId = await insertView({
			userId: USER_A,
			filters: { sortBy: "title", sortDirection: "asc" },
		});
		const zebra = await insertItem("Zebra");
		const apple = await insertItem("Apple");

		await handleReorderViewItems(viewId, [zebra, apple], USER_A);

		const filters = (await readFilters(viewId)) as FilterAndSortOptions;
		const result = await runItemQuery(filters, USER_A, 0, viewId);

		expect(result.items.map((item) => item.title)).toEqual(["Zebra", "Apple"]);
	});
});
