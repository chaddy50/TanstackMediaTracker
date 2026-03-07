import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import type { View } from "#/server/views";
import { SidebarItem } from "./SidebarItem";

interface SortableViewItemProps {
	view: View;
}

export function SortableViewItem({ view }: SortableViewItemProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: view.id,
	});

	return (
		<div
			ref={setNodeRef}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
				opacity: isDragging ? 0.4 : 1,
			}}
			className="flex items-center group"
		>
			<div className="w-0 overflow-hidden group-hover:w-4 transition-[width] shrink-0">
				<button
					className="flex items-center justify-center py-2 text-muted-foreground cursor-grab active:cursor-grabbing"
					{...attributes}
					{...listeners}
					tabIndex={-1}
				>
					<GripVertical className="size-3.5" />
				</button>
			</div>
			<div className="flex-1 min-w-0">
				<SidebarItem to="/views/$viewId" params={{ viewId: String(view.id) }}>
					{view.name}
				</SidebarItem>
			</div>
		</div>
	);
}
