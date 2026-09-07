import { asc, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { viewGroups, views } from "#/database/schema";
import { testDb } from "#/tests/integration/db";
import {
	insertView,
	insertViewGroup,
	truncateAll,
} from "#/tests/integration/helpers";
import {
	findNextTopLevelDisplayOrder,
	findOwnedViewGroup,
	handleDeleteViewGroup,
	handleSaveSidebarLayout,
} from "../viewGroup.server";

const USER_A = "user-a";
const USER_B = "user-b";

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readViews(userId: string) {
	return testDb
		.select({
			id: views.id,
			displayOrder: views.displayOrder,
			groupId: views.groupId,
		})
		.from(views)
		.where(eq(views.userId, userId))
		.orderBy(asc(views.id));
}

async function readGroups(userId: string) {
	return testDb
		.select({ id: viewGroups.id, displayOrder: viewGroups.displayOrder })
		.from(viewGroups)
		.where(eq(viewGroups.userId, userId))
		.orderBy(asc(viewGroups.id));
}

// ---------------------------------------------------------------------------
// handleSaveSidebarLayout
// ---------------------------------------------------------------------------

describe("handleSaveSidebarLayout", () => {
	it("writes 0..n-1 across views and groups for an interleaved top level", async () => {
		const firstView = await insertView({ userId: USER_A });
		const secondView = await insertView({ userId: USER_A });
		const groupId = await insertViewGroup({ userId: USER_A });

		await handleSaveSidebarLayout(
			{
				topLevel: [
					{ kind: "view", id: firstView },
					{ kind: "group", id: groupId },
					{ kind: "view", id: secondView },
				],
				groups: [{ groupId, viewIds: [] }],
			},
			USER_A,
		);

		expect(await readViews(USER_A)).toEqual([
			{ id: firstView, displayOrder: 0, groupId: null },
			{ id: secondView, displayOrder: 2, groupId: null },
		]);
		expect(await readGroups(USER_A)).toEqual([
			{ id: groupId, displayOrder: 1 },
		]);
	});

	it("sets groupId and a within-group position for each grouped view", async () => {
		const groupId = await insertViewGroup({ userId: USER_A });
		const first = await insertView({ userId: USER_A });
		const second = await insertView({ userId: USER_A });

		await handleSaveSidebarLayout(
			{
				topLevel: [{ kind: "group", id: groupId }],
				groups: [{ groupId, viewIds: [second, first] }],
			},
			USER_A,
		);

		expect(await readViews(USER_A)).toEqual([
			{ id: first, displayOrder: 1, groupId },
			{ id: second, displayOrder: 0, groupId },
		]);
	});

	it("clears groupId for a view moved back to the top level", async () => {
		const groupId = await insertViewGroup({ userId: USER_A });
		const viewId = await insertView({ userId: USER_A, groupId });

		await handleSaveSidebarLayout(
			{
				topLevel: [
					{ kind: "view", id: viewId },
					{ kind: "group", id: groupId },
				],
				groups: [{ groupId, viewIds: [] }],
			},
			USER_A,
		);

		expect(await readViews(USER_A)).toEqual([
			{ id: viewId, displayOrder: 0, groupId: null },
		]);
	});

	it("refuses a layout naming another user's view", async () => {
		const ownView = await insertView({ userId: USER_A });
		const otherView = await insertView({ userId: USER_B, displayOrder: 7 });

		await expect(
			handleSaveSidebarLayout(
				{
					topLevel: [
						{ kind: "view", id: ownView },
						{ kind: "view", id: otherView },
					],
					groups: [],
				},
				USER_A,
			),
		).rejects.toThrow(/outside the user's own/);

		expect(await readViews(USER_B)).toEqual([
			{ id: otherView, displayOrder: 7, groupId: null },
		]);
	});

	it("refuses a layout naming another user's group", async () => {
		const otherGroup = await insertViewGroup({
			userId: USER_B,
			displayOrder: 4,
		});

		await expect(
			handleSaveSidebarLayout(
				{
					topLevel: [{ kind: "group", id: otherGroup }],
					groups: [{ groupId: otherGroup, viewIds: [] }],
				},
				USER_A,
			),
		).rejects.toThrow(/outside the user's own/);

		expect(await readGroups(USER_B)).toEqual([
			{ id: otherGroup, displayOrder: 4 },
		]);
	});

	it("refuses a view listed in two places at once", async () => {
		const groupId = await insertViewGroup({ userId: USER_A });
		const viewId = await insertView({ userId: USER_A });

		await expect(
			handleSaveSidebarLayout(
				{
					topLevel: [
						{ kind: "view", id: viewId },
						{ kind: "group", id: groupId },
					],
					groups: [{ groupId, viewIds: [viewId] }],
				},
				USER_A,
			),
		).rejects.toThrow(/same view more than once/);
	});

	it("refuses a group placed twice", async () => {
		const groupId = await insertViewGroup({ userId: USER_A });

		await expect(
			handleSaveSidebarLayout(
				{
					topLevel: [
						{ kind: "group", id: groupId },
						{ kind: "group", id: groupId },
					],
					groups: [],
				},
				USER_A,
			),
		).rejects.toThrow(/same group more than once/);
	});

	it("refuses a group ordered without being placed", async () => {
		const groupId = await insertViewGroup({ userId: USER_A });

		await expect(
			handleSaveSidebarLayout(
				{ topLevel: [], groups: [{ groupId, viewIds: [] }] },
				USER_A,
			),
		).rejects.toThrow(/without placing it/);
	});

	it("refuses a nonexistent view id", async () => {
		await expect(
			handleSaveSidebarLayout(
				{ topLevel: [{ kind: "view", id: 9999 }], groups: [] },
				USER_A,
			),
		).rejects.toThrow(/outside the user's own/);
	});

	it("leaves every row at its prior position when the layout is refused", async () => {
		const ownView = await insertView({ userId: USER_A, displayOrder: 3 });
		const otherView = await insertView({ userId: USER_B });

		await expect(
			handleSaveSidebarLayout(
				{
					topLevel: [
						{ kind: "view", id: ownView },
						{ kind: "view", id: otherView },
					],
					groups: [],
				},
				USER_A,
			),
		).rejects.toThrow();

		expect(await readViews(USER_A)).toEqual([
			{ id: ownView, displayOrder: 3, groupId: null },
		]);
	});

	it("accepts an empty layout without touching anything", async () => {
		const viewId = await insertView({ userId: USER_A, displayOrder: 5 });

		await handleSaveSidebarLayout({ topLevel: [], groups: [] }, USER_A);

		expect(await readViews(USER_A)).toEqual([
			{ id: viewId, displayOrder: 5, groupId: null },
		]);
	});
});

// ---------------------------------------------------------------------------
// handleDeleteViewGroup
// ---------------------------------------------------------------------------

describe("handleDeleteViewGroup", () => {
	it("deletes the group and returns its views to the top level", async () => {
		const groupId = await insertViewGroup({ userId: USER_A });
		const viewId = await insertView({ userId: USER_A, groupId });

		await handleDeleteViewGroup(groupId, USER_A);

		expect(await readGroups(USER_A)).toEqual([]);
		expect(await readViews(USER_A)).toEqual([
			{ id: viewId, displayOrder: 0, groupId: null },
		]);
	});

	it("leaves another user's group of the same name alone", async () => {
		const ownGroup = await insertViewGroup({ userId: USER_A });
		const otherGroup = await insertViewGroup({ userId: USER_B });

		await handleDeleteViewGroup(ownGroup, USER_A);

		expect(await readGroups(USER_B)).toEqual([
			{ id: otherGroup, displayOrder: 0 },
		]);
	});

	it("leaves views in other groups untouched", async () => {
		const deletedGroup = await insertViewGroup({ userId: USER_A });
		const keptGroup = await insertViewGroup({ userId: USER_A });
		const keptView = await insertView({ userId: USER_A, groupId: keptGroup });

		await handleDeleteViewGroup(deletedGroup, USER_A);

		expect(await readViews(USER_A)).toEqual([
			{ id: keptView, displayOrder: 0, groupId: keptGroup },
		]);
	});

	it("refuses another user's group", async () => {
		const otherGroup = await insertViewGroup({ userId: USER_B });

		await expect(handleDeleteViewGroup(otherGroup, USER_A)).rejects.toThrow(
			/not found/,
		);
		expect(await readGroups(USER_B)).toHaveLength(1);
	});

	it("refuses an unknown group id", async () => {
		await expect(handleDeleteViewGroup(9999, USER_A)).rejects.toThrow(
			/not found/,
		);
	});
});

// ---------------------------------------------------------------------------
// findOwnedViewGroup
// ---------------------------------------------------------------------------

describe("findOwnedViewGroup", () => {
	it("returns the group for its owner", async () => {
		const groupId = await insertViewGroup({ userId: USER_A, name: "Reading" });

		const group = await findOwnedViewGroup(groupId, USER_A);

		expect(group.name).toBe("Reading");
	});

	it("throws for another user's group", async () => {
		const groupId = await insertViewGroup({ userId: USER_B });

		await expect(findOwnedViewGroup(groupId, USER_A)).rejects.toThrow(
			`View group ${groupId} not found`,
		);
	});

	it("throws for an unknown id", async () => {
		await expect(findOwnedViewGroup(9999, USER_A)).rejects.toThrow(/not found/);
	});
});

// ---------------------------------------------------------------------------
// findNextTopLevelDisplayOrder
// ---------------------------------------------------------------------------

describe("findNextTopLevelDisplayOrder", () => {
	it("returns 0 for an empty sidebar", async () => {
		expect(await findNextTopLevelDisplayOrder(USER_A)).toBe(0);
	});

	it("sits one past the highest top-level view or group", async () => {
		await insertView({ userId: USER_A, displayOrder: 2 });
		await insertViewGroup({ userId: USER_A, displayOrder: 5 });

		expect(await findNextTopLevelDisplayOrder(USER_A)).toBe(6);
	});

	it("ignores views nested inside a group", async () => {
		const groupId = await insertViewGroup({ userId: USER_A, displayOrder: 0 });
		await insertView({ userId: USER_A, displayOrder: 99, groupId });

		expect(await findNextTopLevelDisplayOrder(USER_A)).toBe(1);
	});

	it("ignores another user's sidebar", async () => {
		await insertViewGroup({ userId: USER_B, displayOrder: 42 });

		expect(await findNextTopLevelDisplayOrder(USER_A)).toBe(0);
	});
});
