import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

/**
 * Cache key for a paginated list, scoped to the history entry it was loaded on.
 *
 * Pages accumulated by scrolling are only worth restoring when the user comes back to
 * the very same history entry — pressing back out of a details screen. Reaching the
 * list again from the sidebar is a new entry and should start at page one. Keying on
 * `__TSR_key` is what makes that distinction, and it is the same key the router's
 * scroll restoration uses, so the restored rows and the restored scroll offset can
 * never disagree about which visit they belong to.
 *
 * The entry is read once, at mount, rather than subscribed to. `state.location` flips
 * to the destination as soon as a navigation *starts*, while this list is still on
 * screen waiting for the next route's loader — so subscribing would change the key
 * out from under a visible list and collapse it back to page one for a frame.
 */
export function useListCacheKey(listName: string, query: unknown): string {
	const router = useRouter();
	const [historyEntryKey] = useState(
		() => router.state.location.state.__TSR_key,
	);

	return `${listName}:${historyEntryKey ?? ""}:${JSON.stringify(query)}`;
}
