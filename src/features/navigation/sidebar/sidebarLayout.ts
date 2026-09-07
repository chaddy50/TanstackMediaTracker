import type { View } from "#/features/screens/customView/view";
import type { ViewGroup } from "#/features/screens/customView/viewGroup";
import type { SidebarLayout } from "#/features/screens/customView/viewGroup.server";
import type { DraggedItem, DropTarget } from "./dropSlots";

/**
 * The sidebar's tree model and the one move that can be made to it, with no
 * React and no dnd-kit. Keeping the arrangement here is what lets it be
 * reasoned about — and tested — without a rendered drag.
 */

export type SidebarEntry =
	| { kind: "view"; view: View }
	| { kind: "group"; group: ViewGroup; views: View[] };

/**
 * Folds the two queries into the tree the sidebar renders: ungrouped views and
 * groups interleaved at the top level, each group carrying its own views.
 */
export function buildSidebarEntries(
	allViews: View[],
	groups: ViewGroup[],
): SidebarEntry[] {
	const groupsById = new Map(groups.map((group) => [group.id, group]));
	const viewsByGroupId = new Map<number, View[]>();
	const ungroupedViews: View[] = [];

	for (const view of allViews) {
		// A view pointing at a group that is no longer there still belongs on
		// screen — drop it back to the top level rather than losing it.
		if (view.groupId === null || !groupsById.has(view.groupId)) {
			ungroupedViews.push(view);
			continue;
		}

		const siblings = viewsByGroupId.get(view.groupId);
		if (siblings) {
			siblings.push(view);
			continue;
		}
		viewsByGroupId.set(view.groupId, [view]);
	}

	const entries: SidebarEntry[] = [
		...ungroupedViews.map((view): SidebarEntry => ({ kind: "view", view })),
		...groups.map(
			(group): SidebarEntry => ({
				kind: "group",
				group,
				views: sortByDisplayOrder(viewsByGroupId.get(group.id) ?? []),
			}),
		),
	];

	return entries.sort(compareTopLevelEntries);
}

/** The whole tree in the shape `saveSidebarLayout` persists. */
export function toLayoutPayload(entries: SidebarEntry[]): SidebarLayout {
	return {
		topLevel: entries.map((entry) => ({
			kind: entry.kind,
			id: entry.kind === "view" ? entry.view.id : entry.group.id,
		})),
		groups: entries
			.filter((entry) => entry.kind === "group")
			.map((entry) => ({
				groupId: entry.group.id,
				viewIds: entry.views.map((view) => view.id),
			})),
	};
}

/**
 * The tree after a drag lands on `target`, or the tree untouched when that
 * changes nothing.
 *
 * A slot's index counts positions in the tree **as rendered**, with the dragged
 * item still in it. Lifting the item out shifts every position after it down
 * one, so an index past where the item was has to come back one to land where
 * the user aimed. That single adjustment is the whole of the arithmetic, and
 * getting it wrong is what puts a drop a slot away from the cursor — so it
 * happens here, once, and nowhere else.
 */
export function applyDropTarget(
	entries: SidebarEntry[],
	dragged: DraggedItem,
	target: DropTarget,
): SidebarEntry[] {
	if (dragged.kind === "group") {
		if (target.kind !== "topLevel") {
			throw new Error(
				`Group ${dragged.id} cannot be dropped inside group ${target.groupId} — groups never nest`,
			);
		}
		return placeGroup(entries, dragged.id, target.index);
	}

	return placeView(entries, dragged.id, target);
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function placeGroup(
	entries: SidebarEntry[],
	groupId: number,
	targetIndex: number,
): SidebarEntry[] {
	const currentIndex = entries.findIndex(
		(entry) => entry.kind === "group" && entry.group.id === groupId,
	);
	const moved = entries[currentIndex];
	if (!moved) {
		return entries;
	}

	const lifted = entries.filter((_, index) => index !== currentIndex);
	const placed = insertAt(
		lifted,
		afterLifting(targetIndex, currentIndex),
		moved,
	);
	return keepIfChanged(entries, placed);
}

function placeView(
	entries: SidebarEntry[],
	viewId: number,
	target: DropTarget,
): SidebarEntry[] {
	const movedView = findView(entries, viewId);
	if (!movedView) {
		return entries;
	}

	const lifted = removeView(entries, viewId);

	if (target.kind === "topLevel") {
		const currentIndex = entries.findIndex(
			(entry) => entry.kind === "view" && entry.view.id === viewId,
		);
		const placed = insertAt(lifted, afterLifting(target.index, currentIndex), {
			kind: "view",
			view: movedView,
		});
		return keepIfChanged(entries, placed);
	}

	const currentIndex = findGroupViews(entries, target.groupId).findIndex(
		(view) => view.id === viewId,
	);
	const placed = lifted.map((entry) => {
		if (entry.kind !== "group" || entry.group.id !== target.groupId) {
			return entry;
		}
		return {
			...entry,
			views: insertAt(
				entry.views,
				afterLifting(target.index, currentIndex),
				movedView,
			),
		};
	});
	return keepIfChanged(entries, placed);
}

/**
 * A target index rebased onto the list the dragged item has been lifted out of.
 * `currentIndex` is where the item sat in that same list, or -1 when it came
 * from somewhere else and nothing shifted.
 */
function afterLifting(targetIndex: number, currentIndex: number): number {
	const hasShifted = currentIndex !== -1 && targetIndex > currentIndex;
	return hasShifted ? targetIndex - 1 : targetIndex;
}

/** The original tree when the move was a no-op, so the drop saves nothing. */
function keepIfChanged(
	original: SidebarEntry[],
	placed: SidebarEntry[],
): SidebarEntry[] {
	return describeArrangement(placed) === describeArrangement(original)
		? original
		: placed;
}

function describeArrangement(entries: SidebarEntry[]): string {
	return entries
		.map((entry) =>
			entry.kind === "view"
				? `v${entry.view.id}`
				: `g${entry.group.id}[${entry.views.map((view) => view.id).join(",")}]`,
		)
		.join("|");
}

function compareTopLevelEntries(a: SidebarEntry, b: SidebarEntry): number {
	const orderDifference = topLevelDisplayOrder(a) - topLevelDisplayOrder(b);
	if (orderDifference !== 0) {
		return orderDifference;
	}

	// Rows predating grouping all sit at the default 0, so ties need a rule of
	// their own or the sidebar reshuffles between loads.
	if (a.kind !== b.kind) {
		return a.kind === "view" ? -1 : 1;
	}

	return topLevelId(a) - topLevelId(b);
}

function topLevelDisplayOrder(entry: SidebarEntry): number {
	return entry.kind === "view"
		? entry.view.displayOrder
		: entry.group.displayOrder;
}

function topLevelId(entry: SidebarEntry): number {
	return entry.kind === "view" ? entry.view.id : entry.group.id;
}

function sortByDisplayOrder(groupViews: View[]): View[] {
	return [...groupViews].sort(
		(a, b) => a.displayOrder - b.displayOrder || a.id - b.id,
	);
}

function findGroupViews(entries: SidebarEntry[], groupId: number): View[] {
	const entry = entries.find(
		(candidate) => candidate.kind === "group" && candidate.group.id === groupId,
	);
	return entry?.kind === "group" ? entry.views : [];
}

function findView(entries: SidebarEntry[], viewId: number): View | undefined {
	for (const entry of entries) {
		if (entry.kind === "view" && entry.view.id === viewId) {
			return entry.view;
		}
		if (entry.kind === "group") {
			const found = entry.views.find((view) => view.id === viewId);
			if (found) {
				return found;
			}
		}
	}

	return undefined;
}

function removeView(entries: SidebarEntry[], viewId: number): SidebarEntry[] {
	return entries
		.filter((entry) => entry.kind !== "view" || entry.view.id !== viewId)
		.map((entry) => {
			if (entry.kind !== "group") {
				return entry;
			}
			return {
				...entry,
				views: entry.views.filter((view) => view.id !== viewId),
			};
		});
}

function insertAt<T>(items: T[], index: number, item: T): T[] {
	const boundedIndex = Math.max(0, Math.min(index, items.length));
	return [...items.slice(0, boundedIndex), item, ...items.slice(boundedIndex)];
}
