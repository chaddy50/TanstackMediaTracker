import { GripVertical } from "lucide-react";

import { type View } from "#/server/views";
import { SidebarItem } from "./SidebarItem";

interface DragOverlayViewItemProps {
	view: View;
}

export function DragOverlayViewItem({ view }: DragOverlayViewItemProps) {
	return (
		<div className="flex items-center bg-card rounded-md shadow-lg border border-border">
			<span className="flex items-center justify-center px-0.5 py-2 text-muted-foreground">
				<GripVertical className="size-3.5" />
			</span>
			<div className="flex-1 min-w-0">
				<SidebarItem to="/views/$viewId" params={{ viewId: String(view.id) }}>
					{view.name}
				</SidebarItem>
			</div>
		</div>
	);
}
