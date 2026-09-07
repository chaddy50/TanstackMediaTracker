import type { KeyboardEvent, RefObject } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { buildDropSlots, type DraggedItem, type DropSlot } from "./dropSlots";
import { applyDropTarget, type SidebarEntry } from "./sidebarLayout";
import type { SidebarRow } from "./sidebarRows";
import { measureSidebarRows, toDraggedItem } from "./useSidebarDrag";

/**
 * Reordering from the keyboard, walking the very same `DropSlot` list a pointer
 * picks from. Sharing the model is what keeps the two input methods honest with
 * each other: arrow keys step through the slots the drag would have offered,
 * and left/right cross between two slots sharing a y — the keyboard equivalent
 * of pulling a view out of its group.
 */

interface KeyboardReorderOptions {
	entries: SidebarEntry[];
	rows: SidebarRow[];
	listRef: RefObject<HTMLElement | null>;
	rowNodes: ReadonlyMap<string, HTMLElement>;
	saveLayout: (entries: SidebarEntry[]) => void;
}

interface ReorderState {
	item: DraggedItem;
	slots: DropSlot[];
	slotIndex: number;
}

export function useSidebarKeyboardReorder({
	entries,
	rows,
	listRef,
	rowNodes,
	saveLayout,
}: KeyboardReorderOptions) {
	const { t } = useTranslation();
	const [reorder, setReorder] = useState<ReorderState | null>(null);

	function start(row: SidebarRow) {
		const list = listRef.current;
		const item = toDraggedItem(row);
		if (!list || !item) {
			return;
		}

		// Nothing has measured the rows yet — a keyboard reorder is not preceded
		// by a drag, so it takes its own reading.
		const { geometry } = measureSidebarRows(list, rowNodes, rows);
		const slots = buildDropSlots(geometry, item);
		if (slots.length === 0) {
			return;
		}

		setReorder({
			item,
			slots,
			slotIndex: indexOfCurrentSlot(slots, entries, item),
		});
	}

	function step(state: ReorderState, offset: number) {
		const slotIndex = Math.max(
			0,
			Math.min(state.slotIndex + offset, state.slots.length - 1),
		);
		setReorder({ ...state, slotIndex });
	}

	/** Crosses to a slot sharing this one's y — the change-of-depth move. */
	function stepDepth(state: ReorderState, offset: number) {
		const current = state.slots[state.slotIndex];
		const next = state.slots[state.slotIndex + offset];
		if (!current || !next || next.y !== current.y) {
			return;
		}
		setReorder({ ...state, slotIndex: state.slotIndex + offset });
	}

	function commit(state: ReorderState) {
		const slot = state.slots[state.slotIndex];
		if (slot) {
			const rearranged = applyDropTarget(entries, state.item, slot.target);
			if (rearranged !== entries) {
				saveLayout(rearranged);
			}
		}
		setReorder(null);
	}

	function onHandleKeyDown(row: SidebarRow) {
		return (event: KeyboardEvent) => {
			const isCommitKey = event.key === "Enter" || event.key === " ";

			if (!reorder) {
				if (!isCommitKey) {
					return;
				}
				event.preventDefault();
				start(row);
				return;
			}

			if (isCommitKey) {
				event.preventDefault();
				commit(reorder);
				return;
			}

			switch (event.key) {
				case "ArrowDown":
					event.preventDefault();
					step(reorder, 1);
					return;
				case "ArrowUp":
					event.preventDefault();
					step(reorder, -1);
					return;
				case "ArrowRight":
					event.preventDefault();
					stepDepth(reorder, 1);
					return;
				case "ArrowLeft":
					event.preventDefault();
					stepDepth(reorder, -1);
					return;
				case "Escape":
					event.preventDefault();
					setReorder(null);
					return;
				default:
					return;
			}
		};
	}

	function describeSlot(slot: DropSlot): string {
		const { target } = slot;
		if (target.kind === "topLevel") {
			return t("views.reorderPosition", {
				position: target.index + 1,
				count: entries.length,
			});
		}

		const holder = entries.find(
			(entry) => entry.kind === "group" && entry.group.id === target.groupId,
		);
		if (holder?.kind !== "group") {
			return "";
		}

		return t("views.reorderPositionInGroup", {
			position: target.index + 1,
			count: holder.views.length,
			group: holder.group.name,
		});
	}

	const slot = reorder ? (reorder.slots[reorder.slotIndex] ?? null) : null;

	return {
		slot,
		announcement: slot ? describeSlot(slot) : "",
		onHandleKeyDown,
	};
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** The slot standing for where the item already is, so stepping starts there. */
function indexOfCurrentSlot(
	slots: DropSlot[],
	entries: SidebarEntry[],
	item: DraggedItem,
): number {
	if (item.kind === "group") {
		const index = entries.findIndex(
			(entry) => entry.kind === "group" && entry.group.id === item.id,
		);
		return Math.max(
			0,
			slots.findIndex(
				(slot) =>
					slot.target.kind === "topLevel" && slot.target.index === index,
			),
		);
	}

	const topLevelIndex = entries.findIndex(
		(entry) => entry.kind === "view" && entry.view.id === item.id,
	);
	if (topLevelIndex !== -1) {
		return Math.max(
			0,
			slots.findIndex(
				(slot) =>
					slot.target.kind === "topLevel" &&
					slot.target.index === topLevelIndex,
			),
		);
	}

	for (const entry of entries) {
		if (entry.kind !== "group") {
			continue;
		}
		const index = entry.views.findIndex((view) => view.id === item.id);
		if (index === -1) {
			continue;
		}
		return Math.max(
			0,
			slots.findIndex(
				(slot) =>
					slot.target.kind === "inGroup" &&
					slot.target.groupId === entry.group.id &&
					slot.target.index === index,
			),
		);
	}

	return 0;
}
