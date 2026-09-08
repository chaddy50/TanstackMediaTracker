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
	onHandleBlur?: () => void;
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
	onHandleBlur,
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
					<span className="truncate">{view.name}</span>
				</SidebarItem>
			</div>
			{/*
			 * A zero-width slot until the row is hovered or focused: a handle that
			 * held its space shortened every name for the sake of a hover. Opening it
			 * truncates the label rather than moving it, so the name keeps its left
			 * edge and the row keeps its height — nothing the drag measures shifts.
			 *
			 * pointer-coarse keeps it open where there is no hover to reveal it;
			 * clipped to w-0 it would be untappable, and the drag has a TouchSensor.
			 */}
			<div className="shrink-0 w-0 overflow-hidden transition-[width] group-hover:w-6 group-focus-within:w-6 pointer-coarse:w-6">
				<button
					type="button"
					className="flex w-6 items-center justify-center py-2 text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
					aria-label={t("viewGroups.dragToReorder", { name: view.name })}
					onKeyDown={onHandleKeyDown}
					onBlur={onHandleBlur}
					{...attributes}
					{...listeners}
				>
					<GripVertical className="size-3.5" />
				</button>
			</div>
		</div>
	);
}
