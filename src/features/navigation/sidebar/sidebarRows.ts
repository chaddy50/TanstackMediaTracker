import type { SidebarEntry } from "./sidebarLayout";

/**
 * The sidebar renders one flat list of rows rather than nesting a group's views
 * inside the group's own element. Flattening is what makes every row a sibling
 * of every other: no row's box contains another's, so a drop can be resolved
 * from row geometry alone without a parent and a child competing for the drag.
 */

export type SidebarRow =
	| { kind: "view"; viewId: number; groupId: number | null }
	| { kind: "groupHeader"; groupId: number; viewCount: number }
	| { kind: "groupPlaceholder"; groupId: number };

/** Addresses a row uniquely: a view and a group may share a numeric id. */
export function rowKey(row: SidebarRow): string {
	switch (row.kind) {
		case "view":
			return `view:${row.viewId}`;
		case "groupHeader":
			return `groupHeader:${row.groupId}`;
		case "groupPlaceholder":
			return `groupPlaceholder:${row.groupId}`;
	}
}

/**
 * The group a row is part of, or `null` for a row at the top level. A group's
 * header counts as part of its own group, which is what lets the slot engine
 * recognise the boundary between a header and its first view as interior.
 */
export function rowGroupId(row: SidebarRow): number | null {
	return row.groupId;
}

/**
 * The rows to render, in order. `springOpenGroupIds` holds a collapsed group
 * open for the duration of a drag without disturbing its persisted state.
 */
export function toSidebarRows(
	entries: SidebarEntry[],
	springOpenGroupIds: ReadonlySet<number> = new Set(),
): SidebarRow[] {
	return entries.flatMap((entry): SidebarRow[] => {
		if (entry.kind === "view") {
			return [{ kind: "view", viewId: entry.view.id, groupId: null }];
		}

		const header: SidebarRow = {
			kind: "groupHeader",
			groupId: entry.group.id,
			viewCount: entry.views.length,
		};
		const isOpen =
			!entry.group.isCollapsed || springOpenGroupIds.has(entry.group.id);
		if (!isOpen) {
			return [header];
		}

		// An empty open group still needs one row, or it would be a group with
		// nothing to measure and nowhere to aim a drop.
		if (entry.views.length === 0) {
			return [header, { kind: "groupPlaceholder", groupId: entry.group.id }];
		}

		return [
			header,
			...entry.views.map(
				(view): SidebarRow => ({
					kind: "view",
					viewId: view.id,
					groupId: entry.group.id,
				}),
			),
		];
	});
}
