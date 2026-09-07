import {
	type DragMoveEvent,
	type DragStartEvent,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import { setViewGroupCollapsed } from "#/features/screens/customView/viewGroup";
import {
	buildDropSlots,
	type DraggedItem,
	type DropSlot,
	findDropSlot,
	findRowAt,
	type RowGeometry,
} from "./dropSlots";
import { applyDropTarget, type SidebarEntry } from "./sidebarLayout";
import { rowKey, type SidebarRow, toSidebarRows } from "./sidebarRows";
import { useSidebarLayoutMutation } from "./useSidebarLayoutMutation";

/**
 * Drives a sidebar drag from the pointer alone.
 *
 * No droppables are registered anywhere in the sidebar, so dnd-kit's collision
 * detection never runs and `over` is never consulted — this hook only wants the
 * sensors, the lifecycle, and the translate. Placement is decided by
 * `dropSlots` against geometry measured while the list is standing still, which
 * is why a drop lands where the cursor is rather than where a stale rect says
 * it was.
 */

/** How long a drag rests on a closed group's header before it springs open. */
const SPRING_OPEN_DELAY = 600;

/**
 * How far left of where it started a drag travels before it reads as "take
 * this out of its group". Measured from the grab point rather than from the
 * sidebar's left edge: the drag handle sits at the right of every row, so an
 * absolute threshold near the left margin would mean hauling the cursor the
 * width of the sidebar to unnest a view.
 */
const UNNEST_TRAVEL = 40;

export function useSidebarDrag(entries: SidebarEntry[]) {
	const queryClient = useQueryClient();
	const { saveLayout, hasSaveFailed } = useSidebarLayoutMutation();

	const [springOpenGroupIds, setSpringOpenGroupIds] = useState<
		ReadonlySet<number>
	>(() => new Set());
	const [activeRow, setActiveRow] = useState<SidebarRow | null>(null);
	const [activeSlot, setActiveSlot] = useState<DropSlot | null>(null);

	const rows = useMemo(
		() => toSidebarRows(entries, springOpenGroupIds),
		[entries, springOpenGroupIds],
	);

	const listRef = useRef<HTMLElement | null>(null);
	const rowNodes = useRef(new Map<string, HTMLElement>());
	const geometry = useRef<RowGeometry[]>([]);
	const slots = useRef<DropSlot[]>([]);
	const dragOriginX = useRef(0);
	const dragged = useRef<DraggedItem | null>(null);
	const activeSlotRef = useRef<DropSlot | null>(null);
	const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const dwellRowKey = useRef<string | null>(null);
	const sprungOpenGroupIds = useRef(new Set<number>());

	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
		// A press-and-hold, so a finger swipe still scrolls the sidebar.
		useSensor(TouchSensor, {
			activationConstraint: { delay: 200, tolerance: 8 },
		}),
	);

	// Rebuilt whenever the row list changes, which is exactly when the effect
	// below needs to fire — so the dependency is honest rather than suppressed.
	const measure = useCallback(() => {
		const list = listRef.current;
		if (!list) {
			return;
		}

		const measured = measureSidebarRows(list, rowNodes.current, rows);
		geometry.current = measured.geometry;
		slots.current = dragged.current
			? buildDropSlots(measured.geometry, dragged.current)
			: [];
	}, [rows]);

	// Spring-open is the one thing that moves rows mid-drag. Re-measuring here
	// means the new slots exist before the next move is scored, so the design's
	// "nothing moves" assumption holds for every frame that is actually judged.
	useLayoutEffect(() => {
		if (!dragged.current) {
			return;
		}
		measure();
	}, [measure]);

	function handleDragStart(event: DragStartEvent) {
		const row = rows.find((candidate) => rowKey(candidate) === event.active.id);
		const item = row ? toDraggedItem(row) : null;
		if (!row || !item) {
			return;
		}

		dragged.current = item;
		dragOriginX.current =
			getEventCoordinates(event.activatorEvent)?.x ?? Number.POSITIVE_INFINITY;
		setActiveRow(row);
		measure();
	}

	function handleDragMove(event: DragMoveEvent) {
		const list = listRef.current;
		const item = dragged.current;
		const origin = getEventCoordinates(event.activatorEvent);
		if (!list || !item || !origin) {
			return;
		}

		const listRect = list.getBoundingClientRect();
		// y is converted into the scroll-content space the rows were measured in;
		// x stays in viewport space, where the unnest threshold also lives.
		const pointer = {
			x: origin.x + event.delta.x,
			y: origin.y + event.delta.y - listRect.top + list.scrollTop,
		};

		const slot = findDropSlot(
			slots.current,
			pointer,
			dragOriginX.current - UNNEST_TRAVEL,
		);
		activeSlotRef.current = slot;
		setActiveSlot(slot);

		updateDwell(pointer.y, item);
	}

	function handleDragEnd() {
		const item = dragged.current;
		const slot = activeSlotRef.current;

		if (item && slot) {
			const rearranged = applyDropTarget(entries, item, slot.target);
			if (rearranged !== entries) {
				saveLayout(rearranged);
				keepGroupOpenIfDroppedInto(slot);
			}
		}

		resetDrag();
	}

	function handleDragCancel() {
		resetDrag();
	}

	/**
	 * Starts, restarts, or abandons the spring-open dwell as the drag crosses
	 * rows. A group must never open after the drag that asked for it is over.
	 */
	function updateDwell(contentY: number, item: DraggedItem) {
		if (item.kind !== "view") {
			cancelDwell();
			return;
		}

		const row = findRowAt(geometry.current, contentY);
		const key = row ? rowKey(row) : null;
		if (key === dwellRowKey.current) {
			return;
		}

		cancelDwell();
		dwellRowKey.current = key;

		if (!row || row.kind !== "groupHeader" || isGroupOpen(rows, row.groupId)) {
			return;
		}

		const { groupId } = row;
		dwellTimer.current = setTimeout(() => {
			sprungOpenGroupIds.current.add(groupId);
			setSpringOpenGroupIds((current) => new Set(current).add(groupId));
		}, SPRING_OPEN_DELAY);
	}

	function cancelDwell() {
		if (dwellTimer.current !== null) {
			clearTimeout(dwellTimer.current);
			dwellTimer.current = null;
		}
	}

	/**
	 * A group the drag opened stays open when the view landed inside it —
	 * otherwise it would snap shut over the row that was just moved into it.
	 */
	function keepGroupOpenIfDroppedInto(slot: DropSlot) {
		if (
			slot.target.kind !== "inGroup" ||
			!sprungOpenGroupIds.current.has(slot.target.groupId)
		) {
			return;
		}

		void setViewGroupCollapsed({
			data: { id: slot.target.groupId, isCollapsed: false },
		}).finally(() => {
			void queryClient.invalidateQueries({ queryKey: ["viewGroups"] });
		});
	}

	function resetDrag() {
		cancelDwell();
		dwellRowKey.current = null;
		dragged.current = null;
		activeSlotRef.current = null;
		sprungOpenGroupIds.current = new Set();
		setActiveRow(null);
		setActiveSlot(null);
		setSpringOpenGroupIds(new Set());
	}

	// Clearing on unmount so a group cannot spring open after the sidebar has
	// gone. The ref is stable, so this genuinely has no dependencies.
	useLayoutEffect(
		() => () => {
			if (dwellTimer.current !== null) {
				clearTimeout(dwellTimer.current);
			}
		},
		[],
	);

	return {
		rows,
		sensors,
		activeRow,
		activeSlot,
		springOpenGroupIds,
		hasSaveFailed,
		saveLayout,
		listRef,
		rowNodes: rowNodes.current,
		registerRow(key: string, node: HTMLElement | null) {
			if (node) {
				rowNodes.current.set(key, node);
				return;
			}
			rowNodes.current.delete(key);
		},
		handleDragStart,
		handleDragMove,
		handleDragEnd,
		handleDragCancel,
	};
}

/**
 * Measures the rendered rows into the scroll-content space the slot engine
 * works in, so scrolling mid-drag does not shift what was measured.
 *
 * Shared with `useSidebarKeyboardReorder`, which needs the same geometry
 * without a pointer drag having primed it.
 */
export function measureSidebarRows(
	list: HTMLElement,
	rowNodes: ReadonlyMap<string, HTMLElement>,
	rows: SidebarRow[],
): { geometry: RowGeometry[] } {
	const listRect = list.getBoundingClientRect();
	const geometry: RowGeometry[] = [];

	for (const row of rows) {
		const node = rowNodes.get(rowKey(row));
		if (!node) {
			continue;
		}

		const rect = node.getBoundingClientRect();
		geometry.push({
			row,
			top: rect.top - listRect.top + list.scrollTop,
			height: rect.height,
		});
	}

	return { geometry };
}

export function toDraggedItem(row: SidebarRow): DraggedItem | null {
	if (row.kind === "view") {
		return { kind: "view", id: row.viewId };
	}
	if (row.kind === "groupHeader") {
		return { kind: "group", id: row.groupId };
	}
	return null;
}

function isGroupOpen(rows: SidebarRow[], groupId: number): boolean {
	return rows.some(
		(row) => row.kind !== "groupHeader" && row.groupId === groupId,
	);
}
