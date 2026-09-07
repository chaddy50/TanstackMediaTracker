import { rowGroupId, type SidebarRow } from "./sidebarRows";

/**
 * Where a drag can land, worked out from row geometry alone.
 *
 * The list never reorders mid-drag, so the rows measured at drag start stay
 * true for its whole duration. That is the property everything here rests on:
 * with nothing moving, a drop is decided by arithmetic against fixed numbers
 * rather than by asking a collision detector to referee overlapping boxes.
 *
 * The model is two axes with one job each — **y picks the position, x picks the
 * depth**. Most boundaries offer a single slot and x is irrelevant. The gap
 * after a group's last view is the exception: it means both "end of the group"
 * and "top level, after the group", so two slots share that y and x chooses
 * between them. That is what makes dragging a view out of a group possible even
 * when the group is the only thing in the sidebar.
 */

/** The indent of a nested row, and so the gap between the two depth lines. */
export const NEST_INDENT = 24;

export interface RowGeometry {
	row: SidebarRow;
	/** Top edge in scroll-content coordinates, so scrolling does not shift it. */
	top: number;
	height: number;
}

export type DropTarget =
	| { kind: "topLevel"; index: number }
	| { kind: "inGroup"; groupId: number; index: number };

export interface DropSlot {
	y: number;
	depth: 0 | 1;
	target: DropTarget;
}

export interface DraggedItem {
	kind: "view" | "group";
	id: number;
}

/**
 * Every legal insertion point for `dragged`, ordered down the list and, where
 * two share a y, shallowest first.
 *
 * Indices are expressed against the tree **as currently rendered** — the
 * dragged item included. `applyDropTarget` is what compensates for lifting the
 * item out; doing it here as well would take a slot off by one.
 */
export function buildDropSlots(
	geometry: RowGeometry[],
	dragged: DraggedItem,
): DropSlot[] {
	if (geometry.length === 0) {
		return [];
	}

	const rows = geometry.map((row) => row.row);
	const entryIndexOfRow = mapRowsToTopLevelEntries(rows);
	const openGroupIds = findOpenGroupIds(rows);

	const slots: DropSlot[] = [];

	for (let boundary = 0; boundary <= rows.length; boundary++) {
		const y = boundaryY(geometry, boundary);
		const rowBefore = rows[boundary - 1];
		const rowAfter = rows[boundary];

		if (!isInsideOneGroup(rowBefore, rowAfter)) {
			slots.push({
				y,
				depth: 0,
				target: {
					kind: "topLevel",
					index:
						boundary === 0 ? 0 : (entryIndexOfRow[boundary - 1] as number) + 1,
				},
			});
		}

		const groupId = rowBefore ? rowGroupId(rowBefore) : null;
		if (groupId !== null && openGroupIds.has(groupId)) {
			slots.push({
				y,
				depth: 1,
				target: {
					kind: "inGroup",
					groupId,
					index: countGroupViewsBefore(rows, groupId, boundary),
				},
			});
		}
	}

	// A closed group renders no body rows, so it has no boundary to sit at. One
	// slot at the middle of its header keeps it a place a view can be dropped.
	for (const [index, row] of rows.entries()) {
		if (row.kind !== "groupHeader" || openGroupIds.has(row.groupId)) {
			continue;
		}
		const measured = geometry[index];
		if (!measured) {
			continue;
		}
		slots.push({
			y: measured.top + measured.height / 2,
			depth: 1,
			target: { kind: "inGroup", groupId: row.groupId, index: row.viewCount },
		});
	}

	const legal =
		dragged.kind === "group" ? slots.filter((slot) => slot.depth === 0) : slots;

	return dedupe(legal.sort((a, b) => a.y - b.y || a.depth - b.depth));
}

/**
 * The slot a pointer is asking for: nearest by y, then — only among slots
 * sharing that y — the outer one once the pointer is left of `unnestBelowX`.
 *
 * That threshold is deliberately not derived from the rows' visual indent. A
 * row's drag handle sits at its right edge, so a drag starts far to the right;
 * asking the pointer to reach an indent line a couple of dozen pixels from the
 * left margin meant hauling it across the whole sidebar to leave a group. The
 * caller sets the threshold from where the drag actually began.
 */
export function findDropSlot(
	slots: DropSlot[],
	pointer: { x: number; y: number },
	unnestBelowX: number,
): DropSlot | null {
	const [first] = slots;
	if (!first) {
		return null;
	}

	const nearestY = slots.reduce(
		(best, slot) =>
			Math.abs(slot.y - pointer.y) < Math.abs(best - pointer.y) ? slot.y : best,
		first.y,
	);

	// Slots are already ordered shallowest-first within a y, so the two ends of
	// the co-located run are the only candidates.
	const atNearestY = slots.filter((slot) => slot.y === nearestY);
	return pointer.x <= unnestBelowX
		? (atNearestY.at(0) ?? null)
		: (atNearestY.at(-1) ?? null);
}

/** The row whose band contains `y` — what a spring-open dwell hovers against. */
export function findRowAt(
	geometry: RowGeometry[],
	y: number,
): SidebarRow | null {
	const found = geometry.find(
		(measured) => y >= measured.top && y < measured.top + measured.height,
	);
	return found?.row ?? null;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function boundaryY(geometry: RowGeometry[], boundary: number): number {
	if (boundary === 0) {
		return geometry[0]?.top ?? 0;
	}
	const previous = geometry[boundary - 1];
	return previous ? previous.top + previous.height : 0;
}

/**
 * A boundary with the same group on both sides is interior to that group, and
 * so is not a place anything can sit at the top level.
 */
function isInsideOneGroup(
	rowBefore: SidebarRow | undefined,
	rowAfter: SidebarRow | undefined,
): boolean {
	if (!rowBefore || !rowAfter) {
		return false;
	}
	const groupBefore = rowGroupId(rowBefore);
	return groupBefore !== null && groupBefore === rowGroupId(rowAfter);
}

/** For each row, the index of the top-level entry it belongs to. */
function mapRowsToTopLevelEntries(rows: SidebarRow[]): number[] {
	let entryIndex = -1;
	let openGroupId: number | null = null;

	return rows.map((row) => {
		const groupId = rowGroupId(row);
		const isNewEntry = groupId === null || groupId !== openGroupId;
		if (isNewEntry) {
			entryIndex++;
			openGroupId = groupId;
		}
		return entryIndex;
	});
}

/** The groups showing a body — the only ones with boundaries to drop between. */
function findOpenGroupIds(rows: SidebarRow[]): Set<number> {
	const open = new Set<number>();
	for (const row of rows) {
		if (row.kind === "groupHeader") {
			continue;
		}
		const groupId = rowGroupId(row);
		if (groupId !== null) {
			open.add(groupId);
		}
	}
	return open;
}

function countGroupViewsBefore(
	rows: SidebarRow[],
	groupId: number,
	boundary: number,
): number {
	return rows
		.slice(0, boundary)
		.filter((row) => row.kind === "view" && row.groupId === groupId).length;
}

/**
 * Two boundaries can resolve to the same insertion — the pair either side of an
 * empty group's placeholder row, for instance. Keeping the first leaves the
 * higher of the two, which is the one the eye aims at.
 */
function dedupe(slots: DropSlot[]): DropSlot[] {
	const seen = new Set<string>();
	return slots.filter((slot) => {
		const key = `${slot.depth}:${describeTarget(slot.target)}`;
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}

function describeTarget(target: DropTarget): string {
	return target.kind === "topLevel"
		? `top:${target.index}`
		: `group:${target.groupId}:${target.index}`;
}
