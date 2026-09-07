import { describe, expect, it } from "vitest";

import type { View } from "#/features/screens/customView/view";
import type { ViewGroup } from "#/features/screens/customView/viewGroup";
import {
	buildDropSlots,
	type DraggedItem,
	type DropSlot,
	findDropSlot,
	findRowAt,
	type RowGeometry,
} from "../dropSlots";
import { buildSidebarEntries, type SidebarEntry } from "../sidebarLayout";
import { toSidebarRows } from "../sidebarRows";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIMESTAMP = new Date("2026-01-01T00:00:00Z");
const ROW_HEIGHT = 32;
const DRAGGED_VIEW: DraggedItem = { kind: "view", id: 999 };
/** An arbitrary unnest threshold; the engine only cares that x crosses it. */
const UNNEST_BELOW = 140;

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

/**
 * Rows stacked at a uniform height from y=0, which is all the slot engine ever
 * needs — jsdom has no layout, and none is wanted here.
 */
function geometryOf(entries: SidebarEntry[]): RowGeometry[] {
	return toSidebarRows(entries).map((row, index) => ({
		row,
		top: index * ROW_HEIGHT,
		height: ROW_HEIGHT,
	}));
}

/** A slot as `<y>:d<depth>:<target>`, so a whole table reads at a glance. */
function describeSlots(slots: DropSlot[]): string[] {
	return slots.map(
		(slot) =>
			`${slot.y}:d${slot.depth}:${
				slot.target.kind === "topLevel"
					? `top${slot.target.index}`
					: `g${slot.target.groupId}#${slot.target.index}`
			}`,
	);
}

/** view 1, group 10 holding views 2 and 3, view 4 — the plan's shared fixture. */
function sharedFixture(): SidebarEntry[] {
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

function slotsFor(
	entries: SidebarEntry[],
	dragged: DraggedItem = DRAGGED_VIEW,
): DropSlot[] {
	return buildDropSlots(geometryOf(entries), dragged);
}

// ---------------------------------------------------------------------------
// buildDropSlots
// ---------------------------------------------------------------------------

describe("buildDropSlots", () => {
	it("enumerates the shared fixture exactly", () => {
		expect(describeSlots(slotsFor(sharedFixture()))).toEqual([
			"0:d0:top0",
			"32:d0:top1",
			"64:d1:g10#0",
			"96:d1:g10#1",
			"128:d0:top2",
			"128:d1:g10#2",
			"160:d0:top3",
		]);
	});

	it("offers a top-level slot before the first row and after the last", () => {
		const slots = slotsFor(sharedFixture());

		expect(slots.at(0)).toMatchObject({
			y: 0,
			depth: 0,
			target: { kind: "topLevel", index: 0 },
		});
		expect(slots.at(-1)).toMatchObject({
			y: 160,
			depth: 0,
			target: { kind: "topLevel", index: 3 },
		});
	});

	it("offers no top-level slot strictly inside a group's body", () => {
		const insideGroup = slotsFor(sharedFixture()).filter(
			(slot) => slot.depth === 0 && (slot.y === 64 || slot.y === 96),
		);

		expect(insideGroup).toEqual([]);
	});

	it("offers an in-group slot between the header and each member", () => {
		const inGroup = slotsFor(sharedFixture()).filter(
			(slot) => slot.target.kind === "inGroup",
		);

		expect(describeSlots(inGroup)).toEqual([
			"64:d1:g10#0",
			"96:d1:g10#1",
			"128:d1:g10#2",
		]);
	});

	it("offers both depths at the gap after a group's last view", () => {
		const atGap = slotsFor(sharedFixture()).filter((slot) => slot.y === 128);

		// The same gap means "end of the group" and "top level, after the group".
		// Two slots there, at different indents, is what x gets to choose between.
		expect(describeSlots(atGap)).toEqual(["128:d0:top2", "128:d1:g10#2"]);
	});

	it("still offers a top-level slot when a group is all there is", () => {
		const entries = buildSidebarEntries(
			[
				makeView(2, { displayOrder: 0, groupId: 10 }),
				makeView(3, { displayOrder: 1, groupId: 10 }),
			],
			[makeGroup(10)],
		);

		// Without this a view could never be dragged out of its group, because
		// nothing else at the top level would exist to aim at.
		expect(describeSlots(slotsFor(entries))).toEqual([
			"0:d0:top0",
			"32:d1:g10#0",
			"64:d1:g10#1",
			"96:d0:top1",
			"96:d1:g10#2",
		]);
	});

	it("gives a collapsed group one slot at the middle of its header", () => {
		const entries = buildSidebarEntries(
			[makeView(2, { groupId: 10 })],
			[makeGroup(10, { isCollapsed: true })],
		);

		expect(describeSlots(slotsFor(entries))).toEqual([
			"0:d0:top0",
			"16:d1:g10#1",
			"32:d0:top1",
		]);
	});

	it("offers one in-group slot for an expanded empty group", () => {
		const entries = buildSidebarEntries([], [makeGroup(10)]);
		const inGroup = slotsFor(entries).filter(
			(slot) => slot.target.kind === "inGroup",
		);

		// The placeholder's two boundaries resolve to the same insertion; the
		// higher of the pair is the one kept.
		expect(describeSlots(inGroup)).toEqual(["32:d1:g10#0"]);
	});

	it("offers a dragged group no in-group slots — groups never nest", () => {
		const slots = slotsFor(sharedFixture(), { kind: "group", id: 10 });

		expect(slots.every((slot) => slot.depth === 0)).toBe(true);
		expect(describeSlots(slots)).toEqual([
			"0:d0:top0",
			"32:d0:top1",
			"128:d0:top2",
			"160:d0:top3",
		]);
	});

	it("offers a dragged group no slot inside its own body", () => {
		const slots = slotsFor(sharedFixture(), { kind: "group", id: 10 });

		expect(slots.some((slot) => slot.y === 64 || slot.y === 96)).toBe(false);
	});

	it("leaves no two slots resolving to the same insertion", () => {
		const described = describeSlots(slotsFor(sharedFixture()));

		expect(new Set(described).size).toBe(described.length);
	});

	it("produces no slots for an empty list", () => {
		expect(buildDropSlots([], DRAGGED_VIEW)).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// findDropSlot
// ---------------------------------------------------------------------------

describe("findDropSlot", () => {
	it("takes the slot nearest the pointer's y", () => {
		const slots = slotsFor(sharedFixture());

		expect(
			findDropSlot(slots, { x: UNNEST_BELOW + 1, y: 70 }, UNNEST_BELOW),
		).toMatchObject({ y: 64 });
	});

	it("takes the outer slot when the pointer is pulled left", () => {
		const slots = slotsFor(sharedFixture());

		expect(findDropSlot(slots, { x: 0, y: 128 }, 0)?.target).toEqual({
			kind: "topLevel",
			index: 2,
		});
	});

	it("keeps the nested slot while the pointer is short of the threshold", () => {
		const slots = slotsFor(sharedFixture());

		expect(
			findDropSlot(slots, { x: UNNEST_BELOW + 1, y: 128 }, UNNEST_BELOW)
				?.target,
		).toEqual({
			kind: "inGroup",
			groupId: 10,
			index: 2,
		});
	});

	it("switches depth exactly at the threshold it is given", () => {
		const slots = slotsFor(sharedFixture());

		expect(
			findDropSlot(slots, { x: UNNEST_BELOW, y: 128 }, UNNEST_BELOW)?.depth,
		).toBe(0);
		expect(
			findDropSlot(slots, { x: UNNEST_BELOW + 1, y: 128 }, UNNEST_BELOW)?.depth,
		).toBe(1);
	});

	it("honours a threshold placed anywhere across the sidebar", () => {
		const slots = slotsFor(sharedFixture());

		// The threshold is the caller's to place. Nothing here assumes it sits
		// near the left margin — that assumption is what made unnesting a haul
		// across the whole sidebar.
		expect(findDropSlot(slots, { x: 300, y: 128 }, 400)?.depth).toBe(0);
		expect(findDropSlot(slots, { x: 300, y: 128 }, 200)?.depth).toBe(1);
	});

	it("ignores x where only one slot sits at the nearest y", () => {
		const slots = slotsFor(sharedFixture());

		expect(findDropSlot(slots, { x: 0, y: 64 }, 0)?.target).toEqual({
			kind: "inGroup",
			groupId: 10,
			index: 0,
		});
		expect(findDropSlot(slots, { x: 200, y: 64 }, 0)?.target).toEqual({
			kind: "inGroup",
			groupId: 10,
			index: 0,
		});
	});

	it("never resolves upwards as the pointer travels down", () => {
		const slots = slotsFor(sharedFixture());

		// The inversion guard: a pointer moving down the list must never pick a
		// slot above the one it picked a moment earlier.
		let previousY = Number.NEGATIVE_INFINITY;
		for (let y = 0; y <= 160; y += 4) {
			const slot = findDropSlot(
				slots,
				{ x: UNNEST_BELOW + 1, y },
				UNNEST_BELOW,
			);
			expect(slot).not.toBeNull();
			expect(slot?.y).toBeGreaterThanOrEqual(previousY);
			previousY = slot?.y ?? previousY;
		}
	});

	it("returns null when there is nowhere to drop", () => {
		expect(findDropSlot([], { x: 0, y: 0 }, UNNEST_BELOW)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// findRowAt
// ---------------------------------------------------------------------------

describe("findRowAt", () => {
	it("returns the row whose band contains the point", () => {
		expect(findRowAt(geometryOf(sharedFixture()), 70)).toEqual({
			kind: "view",
			viewId: 2,
			groupId: 10,
		});
	});

	it("returns null above the first row and below the last", () => {
		const geometry = geometryOf(sharedFixture());

		expect(findRowAt(geometry, -5)).toBeNull();
		expect(findRowAt(geometry, 200)).toBeNull();
	});
});
