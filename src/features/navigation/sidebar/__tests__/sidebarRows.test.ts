import { describe, expect, it } from "vitest";

import type { View } from "#/features/screens/customView/view";
import type { ViewGroup } from "#/features/screens/customView/viewGroup";
import { buildSidebarEntries } from "../sidebarLayout";
import { rowKey, type SidebarRow, toSidebarRows } from "../sidebarRows";

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
	} as unknown as View;
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
	} as unknown as ViewGroup;
}

/** Rows as readable strings: a nested view carries `@<groupId>`. */
function describeRows(rows: SidebarRow[]): string[] {
	return rows.map((row) => {
		if (row.kind === "groupHeader") {
			return `header:${row.groupId}(${row.viewCount})`;
		}
		if (row.kind === "groupPlaceholder") {
			return `placeholder:${row.groupId}`;
		}
		return row.groupId === null
			? `view:${row.viewId}`
			: `view:${row.viewId}@${row.groupId}`;
	});
}

// ---------------------------------------------------------------------------
// toSidebarRows
// ---------------------------------------------------------------------------

describe("toSidebarRows", () => {
	it("turns a top-level view into one row with no group", () => {
		const entries = buildSidebarEntries([makeView(1)], []);

		expect(toSidebarRows(entries)).toEqual([
			{ kind: "view", viewId: 1, groupId: null },
		]);
	});

	it("turns an expanded group into a header followed by its members", () => {
		const entries = buildSidebarEntries(
			[
				makeView(2, { displayOrder: 0, groupId: 10 }),
				makeView(3, { displayOrder: 1, groupId: 10 }),
			],
			[makeGroup(10)],
		);

		expect(describeRows(toSidebarRows(entries))).toEqual([
			"header:10(2)",
			"view:2@10",
			"view:3@10",
		]);
	});

	it("gives a collapsed group only its header", () => {
		const entries = buildSidebarEntries(
			[makeView(2, { groupId: 10 })],
			[makeGroup(10, { isCollapsed: true })],
		);

		expect(describeRows(toSidebarRows(entries))).toEqual(["header:10(1)"]);
	});

	it("gives an expanded empty group a placeholder row to aim at", () => {
		const entries = buildSidebarEntries([], [makeGroup(10)]);

		expect(describeRows(toSidebarRows(entries))).toEqual([
			"header:10(0)",
			"placeholder:10",
		]);
	});

	it("treats a collapsed group held open by a drag as expanded", () => {
		const entries = buildSidebarEntries(
			[makeView(2, { groupId: 10 })],
			[makeGroup(10, { isCollapsed: true })],
		);

		expect(describeRows(toSidebarRows(entries, new Set([10])))).toEqual([
			"header:10(1)",
			"view:2@10",
		]);
	});

	it("follows the tree's own order", () => {
		const entries = buildSidebarEntries(
			[
				makeView(1, { displayOrder: 0 }),
				makeView(2, { displayOrder: 0, groupId: 10 }),
				makeView(4, { displayOrder: 2 }),
			],
			[makeGroup(10, { displayOrder: 1 })],
		);

		expect(describeRows(toSidebarRows(entries))).toEqual([
			"view:1",
			"header:10(1)",
			"view:2@10",
			"view:4",
		]);
	});

	it("produces no rows for an empty tree", () => {
		expect(toSidebarRows([])).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// rowKey
// ---------------------------------------------------------------------------

describe("rowKey", () => {
	it("keeps a view and a group sharing a numeric id apart", () => {
		expect(rowKey({ kind: "view", viewId: 1, groupId: null })).not.toEqual(
			rowKey({ kind: "groupHeader", groupId: 1, viewCount: 0 }),
		);
	});

	it("gives a group's header and its placeholder different keys", () => {
		expect(
			rowKey({ kind: "groupHeader", groupId: 3, viewCount: 0 }),
		).not.toEqual(rowKey({ kind: "groupPlaceholder", groupId: 3 }));
	});

	it("is stable for the same row", () => {
		const row: SidebarRow = { kind: "view", viewId: 7, groupId: 2 };

		expect(rowKey(row)).toEqual(rowKey({ ...row }));
	});
});
