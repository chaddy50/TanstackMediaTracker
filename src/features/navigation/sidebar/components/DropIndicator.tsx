import { type DropSlot, NEST_INDENT } from "../dropSlots";

interface DropIndicatorProps {
	slot: DropSlot | null;
}

/**
 * The line showing where a drop will land, and at what level.
 *
 * Its indent is the visible half of the depth gesture: pulling the drag left
 * out of a group moves the line left by `NEST_INDENT`, so the change of nesting
 * is something the user sees rather than something they discover on release.
 *
 * `z-50` puts it above the drag overlay (`z-40`), so the chip under the cursor
 * cannot hide it.
 */
export function DropIndicator({ slot }: DropIndicatorProps) {
	if (!slot) {
		return null;
	}

	return (
		<div
			data-testid="drop-indicator"
			data-depth={slot.depth}
			aria-hidden
			className="pointer-events-none absolute left-2 right-2 z-50 h-0.5 bg-primary"
			style={{ top: slot.y, marginLeft: slot.depth * NEST_INDENT }}
		/>
	);
}
