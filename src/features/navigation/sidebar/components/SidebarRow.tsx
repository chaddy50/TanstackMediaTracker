import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { View } from "#/features/screens/customView/view";
import { rowKey } from "../sidebarRows";
import { SidebarItem } from "./SidebarItem";

interface SidebarRowProps {
	view: View;
	/** Indents the row so a view inside a group reads as its child. */
	isNested?: boolean;
	registerRow: (key: string, node: HTMLElement | null) => void;
	onHandleKeyDown?: (event: React.KeyboardEvent) => void;
}

/**
 * One view in the sidebar's flat list.
 *
 * `useDraggable`, never `useSortable`: the row applies no transform of its own
 * and does not move for the duration of a drag. That stillness is what keeps
 * the geometry measured at drag start true, and what lets the drop indicator —
 * rather than a shuffling list — show where the drop will land.
 */
export function SidebarRow({
	view,
	isNested,
	registerRow,
	onHandleKeyDown,
}: SidebarRowProps) {
	const { t } = useTranslation();
	const key = rowKey({ kind: "view", viewId: view.id, groupId: null });
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: key,
	});

	return (
		<div
			ref={(node) => {
				setNodeRef(node);
				registerRow(key, node);
			}}
			// Faded, not hidden: this row marks where the view still is, while the
			// indicator marks where it would go.
			style={{ opacity: isDragging ? 0.4 : 1 }}
			className="flex items-center group"
		>
			{/* pl-6 is NEST_INDENT — the depth line the drag's x is measured against. */}
			<div className={isNested ? "flex-1 min-w-0 pl-6" : "flex-1 min-w-0"}>
				<SidebarItem to="/views/$viewId" params={{ viewId: String(view.id) }}>
					{view.name}
				</SidebarItem>
			</div>
			{/*
			 * The handle keeps its space and only fades in, so nothing on the row
			 * moves as the pointer travels down the sidebar — a shifting label made
			 * it hard to tell what a drag was about to land on.
			 */}
			<button
				type="button"
				className="shrink-0 flex items-center justify-center px-1 py-2 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
				aria-label={t("viewGroups.dragToReorder", { name: view.name })}
				onKeyDown={onHandleKeyDown}
				{...attributes}
				{...listeners}
			>
				<GripVertical className="size-3.5" />
			</button>
		</div>
	);
}
