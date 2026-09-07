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

import { viewGroups, viewItemOrder, views } from "#/database/schema";
import { testDb } from "#/tests/integration/db";
import {
	insertMediaItem,
	insertView,
	insertViewGroup,
	insertViewItemOrder,
	truncateAll,
} from "#/tests/integration/helpers";

const USER = "test-user";

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readView(viewId: number) {
	const [row] = await testDb.select().from(views).where(eq(views.id, viewId));
	return row;
}

async function deleteGroup(groupId: number) {
	await testDb.delete(viewGroups).where(eq(viewGroups.id, groupId));
}

// ---------------------------------------------------------------------------
// views.group_id
// ---------------------------------------------------------------------------

describe("views.group_id", () => {
	it("is cleared, not cascaded, when its group is deleted", async () => {
		const groupId = await insertViewGroup({ userId: USER });
		const viewId = await insertView({ userId: USER, groupId });

		await deleteGroup(groupId);

		expect(await readView(viewId)).toMatchObject({ id: viewId, groupId: null });
	});

	it("leaves the view row itself in place when its group is deleted", async () => {
		const groupId = await insertViewGroup({ userId: USER });
		await insertView({ userId: USER, groupId });

		await deleteGroup(groupId);

		expect(await testDb.select().from(views)).toHaveLength(1);
	});

	it("accepts a null group_id — an ungrouped view is the default", async () => {
		const viewId = await insertView({ userId: USER });

		expect(await readView(viewId)).toMatchObject({ groupId: null });
	});

	it("rejects a group_id that does not exist", async () => {
		await expect(insertView({ userId: USER, groupId: 9999 })).rejects.toThrow();
	});

	it("does not reach view_item_order rows when a group is deleted", async () => {
		const groupId = await insertViewGroup({ userId: USER });
		const viewId = await insertView({ userId: USER, groupId });
		const mediaItemId = await insertMediaItem({
			userId: USER,
			type: MediaItemType.BOOK,
			title: "Ordered",
		});
		await insertViewItemOrder({ viewId, mediaItemId, position: 0 });

		await deleteGroup(groupId);

		expect(
			await testDb
				.select()
				.from(viewItemOrder)
				.where(eq(viewItemOrder.viewId, viewId)),
		).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// view_groups defaults
// ---------------------------------------------------------------------------

describe("view_groups", () => {
	it("defaults a new group to expanded and position 0", async () => {
		const [row] = await testDb
			.insert(viewGroups)
			.values({ userId: USER, name: "Fresh" })
			.returning();

		expect(row).toMatchObject({ isCollapsed: false, displayOrder: 0 });
	});
});
