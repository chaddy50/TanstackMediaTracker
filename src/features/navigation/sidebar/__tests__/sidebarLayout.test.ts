import { describe, expect, it } from "vitest";

import type { View } from "#/features/screens/customView/view";
import type { ViewGroup } from "#/features/screens/customView/viewGroup";
import type { DraggedItem } from "../dropSlots";
import {
	applyDropTarget,
	buildSidebarEntries,
	type SidebarEntry,
	toLayoutPayload,
} from "../sidebarLayout";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIMESTAMP = new Date("2026-01-01T00:00:00Z");

function makeView(
	id: number,
	overrides: { displayOrder?: number; groupId?: number | null } = {},
): View {
	return {
		id,
		userId: "user-a",
		name: `View ${id}`,
		subject: "items",
		filters: {},
		displayOrder: overrides.displayOrder ?? 0,
		groupId: overrides.groupId ?? null,
		createdAt: TIMESTAMP,
		updatedAt: TIMESTAMP,
	};
}

function makeGroup(
	id: number,
	overrides: { displayOrder?: number; isCollapsed?: boolean } = {},
): ViewGroup {
	return {
		id,
		userId: "user-a",
		name: `Group ${id}`,
		displayOrder: overrides.displayOrder ?? 0,
		isCollapsed: overrides.isCollapsed ?? false,
		createdAt: TIMESTAMP,
		updatedAt: TIMESTAMP,
	};
}

/** The rendered shape of a tree, as `kind:id` strings — easy to assert against. */
function describeEntries(entries: SidebarEntry[]): string[] {
	return entries.map((entry) =>
		entry.kind === "view"
			? `view:${entry.view.id}`
			: `group:${entry.group.id}[${entry.views.map((view) => view.id).join(",")}]`,
	);
}

// ---------------------------------------------------------------------------
// buildSidebarEntries
// ---------------------------------------------------------------------------

describe("buildSidebarEntries", () => {
	it("interleaves groups and ungrouped views by displayOrder", () => {
		const entries = buildSidebarEntries(
			[
				makeView(1, { displayOrder: 0 }),
				makeView(2, { displayOrder: 2 }),
				makeView(3, { displayOrder: 0, groupId: 10 }),
			],
			[makeGroup(10, { displayOrder: 1 })],
		);

		expect(describeEntries(entries)).toEqual([
			"view:1",
			"group:10[3]",
			"view:2",
		]);
	});

	it("nests a group's views in their displayOrder", () => {
		const entries = buildSidebarEntries(
			[
				makeView(1, { displayOrder: 2, groupId: 10 }),
				makeView(2, { displayOrder: 0, groupId: 10 }),
				makeView(3, { displayOrder: 1, groupId: 10 }),
			],
			[makeGroup(10)],
		);

		expect(describeEntries(entries)).toEqual(["group:10[2,3,1]"]);
	});

	it("puts views before groups when displayOrder ties", () => {
		const entries = buildSidebarEntries(
			[makeView(1, { displayOrder: 0 })],
			[makeGroup(10, { displayOrder: 0 })],
		);

		expect(describeEntries(entries)).toEqual(["view:1", "group:10[]"]);
	});

	it("breaks a tie within a kind by id", () => {
		const entries = buildSidebarEntries(
			[],
			[makeGroup(20, { displayOrder: 0 }), makeGroup(10, { displayOrder: 0 })],
		);

		expect(describeEntries(entries)).toEqual(["group:10[]", "group:20[]"]);
	});

	it("keeps a view whose group no longer exists, at the top level", () => {
		const entries = buildSidebarEntries(
			[makeView(1, { groupId: 999 })],
			[makeGroup(10)],
		);

		expect(describeEntries(entries)).toEqual(["view:1", "group:10[]"]);
	});

	it("returns an empty tree for no views and no groups", () => {
		expect(buildSidebarEntries([], [])).toEqual([]);
	});

	it("represents a group with no views as an empty group entry", () => {
		expect(describeEntries(buildSidebarEntries([], [makeGroup(10)]))).toEqual([
			"group:10[]",
		]);
	});
});

// ---------------------------------------------------------------------------
// toLayoutPayload
// ---------------------------------------------------------------------------

describe("toLayoutPayload", () => {
	it("emits the top level and each group's views in render order", () => {
		const entries = buildSidebarEntries(
			[
				makeView(1, { displayOrder: 0 }),
				makeView(2, { displayOrder: 0, groupId: 10 }),
				makeView(3, { displayOrder: 1, groupId: 10 }),
			],
			[makeGroup(10, { displayOrder: 1 })],
		);

		expect(toLayoutPayload(entries)).toEqual({
			topLevel: [
				{ kind: "view", id: 1 },
				{ kind: "group", id: 10 },
			],
			groups: [{ groupId: 10, viewIds: [2, 3] }],
		});
	});

	it("emits no groups for an all-ungrouped sidebar", () => {
		const entries = buildSidebarEntries([makeView(1)], []);

		expect(toLayoutPayload(entries)).toEqual({
			topLevel: [{ kind: "view", id: 1 }],
			groups: [],
		});
	});
});

// ---------------------------------------------------------------------------
// Applying a drop
// ---------------------------------------------------------------------------

describe("applyDropTarget", () => {
	/** view 1, group 10 holding views 2 and 3, view 4. */
	function tree() {
		return buildSidebarEntries(
			[
				makeView(1, { displayOrder: 0 }),
				makeView(2, { displayOrder: 0, groupId: 10 }),
				makeView(3, { displayOrder: 1, groupId: 10 }),
				makeView(4, { displayOrder: 2 }),
			],
			[makeGroup(10, { displayOrder: 1 })],
		);
	}

	const view = (id: number): DraggedItem => ({ kind: "view", id });
	const group = (id: number): DraggedItem => ({ kind: "group", id });

	it("lands a view at the exact top-level slot it was dropped on", () => {
		// Slot 2 is the gap between the group and view 4. Lifting view 1 out first
		// shifts that gap up one — the adjustment that keeps the drop under the
		// cursor instead of a place past it.
		const moved = applyDropTarget(tree(), view(1), {
			kind: "topLevel",
			index: 2,
		});

		expect(describeEntries(moved)).toEqual([
			"group:10[2,3]",
			"view:1",
			"view:4",
		]);
	});

	it("lands a view dragged upwards above the row it was aimed at", () => {
		const moved = applyDropTarget(tree(), view(4), {
			kind: "topLevel",
			index: 1,
		});

		expect(describeEntries(moved)).toEqual([
			"view:1",
			"view:4",
			"group:10[2,3]",
		]);
	});

	it("puts a view into a group at the start", () => {
		const moved = applyDropTarget(tree(), view(4), {
			kind: "inGroup",
			groupId: 10,
			index: 0,
		});

		expect(describeEntries(moved)).toEqual(["view:1", "group:10[4,2,3]"]);
	});

	it("puts a view into a group at the end", () => {
		const moved = applyDropTarget(tree(), view(4), {
			kind: "inGroup",
			groupId: 10,
			index: 2,
		});

		expect(describeEntries(moved)).toEqual(["view:1", "group:10[2,3,4]"]);
	});

	it("lifts a view out of a group to just above it", () => {
		const moved = applyDropTarget(tree(), view(2), {
			kind: "topLevel",
			index: 1,
		});

		expect(describeEntries(moved)).toEqual([
			"view:1",
			"view:2",
			"group:10[3]",
			"view:4",
		]);
	});

	it("lifts a view out of a group to just below it", () => {
		const moved = applyDropTarget(tree(), view(2), {
			kind: "topLevel",
			index: 2,
		});

		expect(describeEntries(moved)).toEqual([
			"view:1",
			"group:10[3]",
			"view:2",
			"view:4",
		]);
	});

	it("reorders within a group in both directions", () => {
		expect(
			describeEntries(
				applyDropTarget(tree(), view(3), {
					kind: "inGroup",
					groupId: 10,
					index: 0,
				}),
			),
		).toEqual(["view:1", "group:10[3,2]", "view:4"]);

		expect(
			describeEntries(
				applyDropTarget(tree(), view(2), {
					kind: "inGroup",
					groupId: 10,
					index: 2,
				}),
			),
		).toEqual(["view:1", "group:10[3,2]", "view:4"]);
	});

	it("moves a view straight from one group to another", () => {
		const entries = buildSidebarEntries(
			[
				makeView(2, { displayOrder: 0, groupId: 10 }),
				makeView(3, { displayOrder: 0, groupId: 20 }),
			],
			[makeGroup(10, { displayOrder: 0 }), makeGroup(20, { displayOrder: 1 })],
		);

		const moved = applyDropTarget(entries, view(2), {
			kind: "inGroup",
			groupId: 20,
			index: 1,
		});

		expect(describeEntries(moved)).toEqual(["group:10[]", "group:20[3,2]"]);
	});

	it("moves a group among the top-level entries, carrying its views", () => {
		const moved = applyDropTarget(tree(), group(10), {
			kind: "topLevel",
			index: 0,
		});

		expect(describeEntries(moved)).toEqual([
			"group:10[2,3]",
			"view:1",
			"view:4",
		]);
	});

	it("refuses to drop a group inside a group", () => {
		expect(() =>
			applyDropTarget(tree(), group(10), {
				kind: "inGroup",
				groupId: 10,
				index: 0,
			}),
		).toThrow(/never nest/);
	});

	it("hands back the same tree when the drop changes nothing", () => {
		const entries = tree();

		// Both slots either side of view 1 mean "where view 1 already is".
		expect(
			applyDropTarget(entries, view(1), { kind: "topLevel", index: 0 }),
		).toBe(entries);
		expect(
			applyDropTarget(entries, view(1), { kind: "topLevel", index: 1 }),
		).toBe(entries);
	});

	it("leaves the tree alone for a view it does not hold", () => {
		const entries = tree();

		expect(
			applyDropTarget(entries, view(999), { kind: "topLevel", index: 0 }),
		).toBe(entries);
	});

	it("does not mutate the tree it was given", () => {
		const entries = tree();
		const before = describeEntries(entries);

		applyDropTarget(entries, view(1), { kind: "topLevel", index: 2 });

		expect(describeEntries(entries)).toEqual(before);
	});

	it("produces a layout the server will accept", () => {
		const moved = applyDropTarget(tree(), view(1), {
			kind: "inGroup",
			groupId: 10,
			index: 0,
		});
		const payload = toLayoutPayload(moved);

		const placedGroupIds = payload.topLevel
			.filter((entry) => entry.kind === "group")
			.map((entry) => entry.id);
		for (const group of payload.groups) {
			expect(placedGroupIds).toContain(group.groupId);
		}

		const viewIds = [
			...payload.topLevel
				.filter((entry) => entry.kind === "view")
				.map((entry) => entry.id),
			...payload.groups.flatMap((group) => group.viewIds),
		];
		expect(new Set(viewIds).size).toBe(viewIds.length);
	});
});
