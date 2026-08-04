import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemType } from "#/lib/enums";

// Redirect all db calls to the test database.
vi.mock("#/database/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/features/screens/auth", () => ({ auth: {} }));
vi.mock("#/features/screens/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

import { mediaItems, viewItemOrder, views } from "#/database/schema";
import { testDb } from "#/tests/integration/db";
import {
	insertMediaItem,
	insertView,
	insertViewItemOrder,
	truncateAll,
} from "#/tests/integration/helpers";

const USER = "test-user";

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function insertItem(title: string) {
	return insertMediaItem({ userId: USER, type: MediaItemType.BOOK, title });
}

async function countAllOrderRows() {
	return (await testDb.select().from(viewItemOrder)).length;
}

async function countOrderRowsForView(viewId: number) {
	return (
		await testDb
			.select()
			.from(viewItemOrder)
			.where(eq(viewItemOrder.viewId, viewId))
	).length;
}

// ---------------------------------------------------------------------------
// Cascades
// ---------------------------------------------------------------------------

describe("view_item_order cascades", () => {
	it("removes a view's order rows when the view is deleted", async () => {
		const viewId = await insertView({ userId: USER });
		const itemId = await insertItem("Gilgamesh");
		await insertViewItemOrder({ viewId, mediaItemId: itemId, position: 0 });

		await testDb.delete(views).where(eq(views.id, viewId));

		expect(await countOrderRowsForView(viewId)).toBe(0);
	});

	it("removes an item's order rows when the item leaves the library", async () => {
		const viewId = await insertView({ userId: USER });
		const removedId = await insertItem("Removed");
		const keptId = await insertItem("Kept");
		await insertViewItemOrder({ viewId, mediaItemId: removedId, position: 0 });
		await insertViewItemOrder({ viewId, mediaItemId: keptId, position: 1 });

		await testDb.delete(mediaItems).where(eq(mediaItems.id, removedId));

		const remaining = await testDb
			.select()
			.from(viewItemOrder)
			.where(eq(viewItemOrder.viewId, viewId));
		expect(remaining.map((row) => row.mediaItemId)).toEqual([keptId]);
	});
});

// ---------------------------------------------------------------------------
// Constraints
// ---------------------------------------------------------------------------

describe("view_item_order constraints", () => {
	it("rejects a duplicate (viewId, mediaItemId) pair", async () => {
		const viewId = await insertView({ userId: USER });
		const itemId = await insertItem("Gilgamesh");
		await insertViewItemOrder({ viewId, mediaItemId: itemId, position: 0 });

		await expect(
			insertViewItemOrder({ viewId, mediaItemId: itemId, position: 1 }),
		).rejects.toThrow();
	});

	it("lets one item hold a position in two different views", async () => {
		const viewA = await insertView({ userId: USER, name: "View A" });
		const viewB = await insertView({ userId: USER, name: "View B" });
		const itemId = await insertItem("Gilgamesh");

		await insertViewItemOrder({
			viewId: viewA,
			mediaItemId: itemId,
			position: 0,
		});
		await insertViewItemOrder({
			viewId: viewB,
			mediaItemId: itemId,
			position: 3,
		});

		expect(await countAllOrderRows()).toBe(2);
	});

	it("rejects a row pointing at a nonexistent view", async () => {
		const itemId = await insertItem("Gilgamesh");

		await expect(
			insertViewItemOrder({
				viewId: 999_999,
				mediaItemId: itemId,
				position: 0,
			}),
		).rejects.toThrow();
	});

	it("rejects a row pointing at a nonexistent media item", async () => {
		const viewId = await insertView({ userId: USER });

		await expect(
			insertViewItemOrder({
				viewId,
				mediaItemId: 999_999,
				position: 0,
			}),
		).rejects.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Fixture guard
// ---------------------------------------------------------------------------

describe("truncateAll", () => {
	it("leaves view_item_order empty for the next test", async () => {
		expect(await countAllOrderRows()).toBe(0);
	});
});
