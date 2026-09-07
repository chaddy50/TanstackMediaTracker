import { useDraggable } from "@dnd-kit/core";
import { ChevronDown, ChevronLeft, GripVertical, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ViewGroup } from "#/features/screens/customView/viewGroup";
import { rowKey } from "../sidebarRows";

interface SidebarGroupHeaderProps {
	group: ViewGroup;
	viewCount: number;
	isOpen: boolean;
	registerRow: (key: string, node: HTMLElement | null) => void;
	onToggleCollapsed: () => void;
	onEdit: () => void;
	onHandleKeyDown?: (event: React.KeyboardEvent) => void;
	onHandleBlur?: () => void;
}

/**
 * A group's header row, and nothing else — the group's views are siblings of
 * this row in the sidebar's flat list, not children of it. Not wrapping them is
 * the point: a header that contained its own views would be a box overlapping
 * every box inside it, which is what made a drop near a group's edge resolve to
 * the parent or a child unpredictably.
 */
export function SidebarGroupHeader({
	group,
	viewCount,
	isOpen,
	registerRow,
	onToggleCollapsed,
	onEdit,
	onHandleKeyDown,
	onHandleBlur,
}: SidebarGroupHeaderProps) {
	const { t } = useTranslation();
	const key = rowKey({ kind: "groupHeader", groupId: group.id, viewCount });
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: key,
	});

	return (
		<div
			ref={(node) => {
				setNodeRef(node);
				registerRow(key, node);
			}}
			style={{ opacity: isDragging ? 0.4 : 1 }}
			className="flex items-center group/viewgroup"
		>
			<button
				type="button"
				onClick={onToggleCollapsed}
				aria-expanded={isOpen}
				aria-label={t(isOpen ? "viewGroups.collapse" : "viewGroups.expand", {
					name: group.name,
				})}
				className="flex flex-1 min-w-0 items-center gap-1 px-2 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
			>
				{/* The name keeps the left edge; the chevron trails it, shrinking
				    against a long name rather than pushing it across. */}
				<span className="truncate">{group.name}</span>
				{isOpen ? (
					<ChevronDown className="size-3.5 shrink-0" />
				) : (
					<ChevronLeft className="size-3.5 shrink-0" />
				)}
			</button>
			<button
				type="button"
				onClick={onEdit}
				aria-label={t("viewGroups.rename", { name: group.name })}
				className="shrink-0 opacity-0 group-hover/viewgroup:opacity-100 focus-visible:opacity-100 transition-opacity px-1 py-2 text-muted-foreground hover:text-foreground"
			>
				<Pencil className="size-3.5" />
			</button>
			{/* Same fixed slot as a view's handle, so the two rows line up. */}
			<button
				type="button"
				className="shrink-0 flex items-center justify-center px-1 py-2 text-muted-foreground opacity-0 group-hover/viewgroup:opacity-100 focus-visible:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
				aria-label={t("viewGroups.dragToReorder", { name: group.name })}
				onKeyDown={onHandleKeyDown}
				onBlur={onHandleBlur}
				{...attributes}
				{...listeners}
			>
				<GripVertical className="size-3.5" />
			</button>
		</div>
	);
}
