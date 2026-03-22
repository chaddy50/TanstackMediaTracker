import { MediaItemStatus } from "#/server/enums";

/**
 * Derive the series status from its items' statuses.
 * Returns null when no status update is warranted (all items are still BACKLOG).
 */
export function inferSeriesStatus(
	statuses: MediaItemStatus[],
): MediaItemStatus | null {
	if (statuses.length === 0) {
		return null;
	}

	const isDone = (s: MediaItemStatus) =>
		s === MediaItemStatus.COMPLETED || s === MediaItemStatus.DROPPED;

	const doneItems = statuses.filter(isDone);
	const activeItems = statuses.filter((s) => !isDone(s));

	// An in-progress item dominates — the series is actively being worked on
	if (activeItems.some((s) => s === MediaItemStatus.IN_PROGRESS)) {
		return MediaItemStatus.IN_PROGRESS;
	}

	// All items finished — series is done
	if (doneItems.length > 0 && activeItems.length === 0) {
		return doneItems.some((s) => s === MediaItemStatus.DROPPED)
			? MediaItemStatus.DROPPED
			: MediaItemStatus.COMPLETED;
	}

	// User paused — waiting for releases or deliberately on hold
	if (
		activeItems.every((s) => s === MediaItemStatus.WAITING_FOR_NEXT_RELEASE)
	) {
		return MediaItemStatus.WAITING_FOR_NEXT_RELEASE;
	}
	if (activeItems.some((s) => s === MediaItemStatus.ON_HOLD)) {
		return MediaItemStatus.ON_HOLD;
	}

	// Some items done, some still remaining — series is in progress
	if (doneItems.length > 0) {
		return MediaItemStatus.IN_PROGRESS;
	}

	// No items started yet — leave series status as-is
	return null;
}
