import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import type { View } from "#/features/screens/customView/view";
import {
	saveSidebarLayout,
	type ViewGroup,
} from "#/features/screens/customView/viewGroup";
import type { SidebarLayout } from "#/features/screens/customView/viewGroup.server";
import { type SidebarEntry, toLayoutPayload } from "./sidebarLayout";

/**
 * Saves the sidebar's arrangement, writing it into the query cache first so the
 * list repaints on the drop rather than on the round trip.
 *
 * The cache is the only place the arrangement lives. A drag changes the tree
 * exactly once, at the drop, so there is no window in which a refetch and an
 * in-progress rearrangement can disagree — the problem a separate copy of the
 * tree in component state used to create.
 */

const VIEWS_KEY = ["views"];
const VIEW_GROUPS_KEY = ["viewGroups"];

export function useSidebarLayoutMutation() {
	const queryClient = useQueryClient();
	const [hasSaveFailed, setHasSaveFailed] = useState(false);

	const mutation = useMutation({
		// Each save writes the whole arrangement, so two in flight at once can
		// land out of order and leave the server holding the older one. A shared
		// scope runs them one after another instead.
		scope: { id: "sidebar-layout" },
		mutationFn: (layout: SidebarLayout) => saveSidebarLayout({ data: layout }),

		async onMutate(layout: SidebarLayout) {
			// Without cancelling, a request already in flight can land after the
			// optimistic write and put the old arrangement back.
			await queryClient.cancelQueries({ queryKey: VIEWS_KEY });
			await queryClient.cancelQueries({ queryKey: VIEW_GROUPS_KEY });

			const previousViews = queryClient.getQueryData<View[]>(VIEWS_KEY);
			const previousGroups =
				queryClient.getQueryData<ViewGroup[]>(VIEW_GROUPS_KEY);

			queryClient.setQueryData<View[]>(VIEWS_KEY, (views) =>
				views ? placeViews(views, layout) : views,
			);
			queryClient.setQueryData<ViewGroup[]>(VIEW_GROUPS_KEY, (groups) =>
				groups ? placeGroups(groups, layout) : groups,
			);

			return { previousViews, previousGroups };
		},

		onError(_error, _layout, context) {
			// The sidebar is showing an arrangement the server rejected, so put the
			// old one back rather than leaving a lie on screen.
			if (context?.previousViews) {
				queryClient.setQueryData(VIEWS_KEY, context.previousViews);
			}
			if (context?.previousGroups) {
				queryClient.setQueryData(VIEW_GROUPS_KEY, context.previousGroups);
			}
			setHasSaveFailed(true);
		},

		onSuccess() {
			setHasSaveFailed(false);
		},

		async onSettled() {
			await queryClient.invalidateQueries({ queryKey: VIEWS_KEY });
			await queryClient.invalidateQueries({ queryKey: VIEW_GROUPS_KEY });
		},
	});

	return {
		saveLayout: (entries: SidebarEntry[]) =>
			mutation.mutate(toLayoutPayload(entries)),
		hasSaveFailed,
	};
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * The same placement the server writes, applied to the cached rows: a view's
 * position within whichever list holds it, and the group it now belongs to.
 */
function placeViews(views: View[], layout: SidebarLayout): View[] {
	const placements = new Map<
		number,
		{ displayOrder: number; groupId: number | null }
	>();

	for (const [position, entry] of layout.topLevel.entries()) {
		if (entry.kind === "view") {
			placements.set(entry.id, { displayOrder: position, groupId: null });
		}
	}
	for (const group of layout.groups) {
		for (const [position, viewId] of group.viewIds.entries()) {
			placements.set(viewId, {
				displayOrder: position,
				groupId: group.groupId,
			});
		}
	}

	return views.map((view) => {
		const placement = placements.get(view.id);
		return placement ? { ...view, ...placement } : view;
	});
}

function placeGroups(groups: ViewGroup[], layout: SidebarLayout): ViewGroup[] {
	const positions = new Map<number, number>();
	for (const [position, entry] of layout.topLevel.entries()) {
		if (entry.kind === "group") {
			positions.set(entry.id, position);
		}
	}

	return groups.map((group) => {
		const displayOrder = positions.get(group.id);
		return displayOrder === undefined ? group : { ...group, displayOrder };
	});
}
