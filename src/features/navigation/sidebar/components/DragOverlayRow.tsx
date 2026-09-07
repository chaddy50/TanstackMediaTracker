interface DragOverlayRowProps {
	name: string;
}

/**
 * What follows the cursor during a drag.
 *
 * A compact chip rather than a full-width row: the drop indicator is a
 * full-width line drawn at the cursor's height, and anything row-shaped under
 * the cursor sits squarely on top of the one thing the drag needs to show.
 */
export function DragOverlayRow({ name }: DragOverlayRowProps) {
	return (
		<div className="w-fit max-w-56 truncate rounded-md border border-border bg-card px-2 py-1 text-sm shadow-lg">
			{name}
		</div>
	);
}
