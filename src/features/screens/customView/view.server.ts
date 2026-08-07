import { and, eq, inArray } from "drizzle-orm";

import { db } from "#/database/index";
import {
	type FilterAndSortOptions,
	mediaItems,
	viewItemOrder,
	views,
} from "#/database/schema";
import {
	runItemStatsQuery,
	runOrderableItemQuery,
} from "#/lib/queries/itemQuery.server";
import type { ItemQueryItem, ItemStats } from "#/lib/queries/types";
import { CUSTOM_ITEM_SORT_FIELD } from "#/lib/sortFields";

/**
 * The server-only half of the custom view feature. It lives apart from `view.ts`
 * because that module is imported by the client: a `createServerFn` handler body
 * is stripped from the client bundle, but a plain exported function is not, so
 * anything reaching into the database or a `.server` module has to sit here.
 */

/**
 * Every item in a view, in its saved order. Throws when the view is not the
 * caller's or is a series view — neither can be hand-ordered.
 */
export async function handleGetViewOrderItems(
	viewId: number,
	userId: string,
): Promise<ItemQueryItem[]> {
	const view = await findOwnedView(viewId, userId);
	if (view.subject !== "items") {
		throw new Error(`View ${viewId} is not an item view`);
	}

	return runOrderableItemQuery(
		(view.filters ?? {}) as FilterAndSortOptions,
		userId,
		viewId,
	);
}

export async function handleGetViewStats(
	viewId: number,
	userId: string,
	titleQuery: string | undefined,
): Promise<ItemStats | null> {
	const view = await findOwnedView(viewId, userId);
	if (view.subject !== "items") {
		return null;
	}

	const filters = {
		...(view.filters ?? {}),
		titleQuery,
	} as FilterAndSortOptions;

	return runItemStatsQuery(filters, userId);
}

/**
 * Replaces a view's hand-built order outright. Ids the caller does not own are
 * dropped, and the survivors are renumbered contiguously so a filtered-out id
 * never leaves a hole in the sequence.
 *
 * Arranging a view by hand is also what switches it to custom order: the
 * positions written here are only honored while the view sorts by them, so a
 * view still sorted by title would save an arrangement it then ignored. This
 * runs only when a drag actually persisted, so entering reorder mode and
 * changing nothing leaves the view's existing sort alone.
 */
export async function handleReorderViewItems(
	viewId: number,
	orderedMediaItemIds: number[],
	userId: string,
): Promise<void> {
	const view = await findOwnedView(viewId, userId);

	const idsToStore = await filterToOwnedItemIds(orderedMediaItemIds, userId);

	await db.transaction(async (tx) => {
		await tx.delete(viewItemOrder).where(eq(viewItemOrder.viewId, viewId));

		if (idsToStore.length > 0) {
			await tx.insert(viewItemOrder).values(
				idsToStore.map((mediaItemId, position) => ({
					viewId,
					mediaItemId,
					position,
				})),
			);
		}

		const filters = (view.filters ?? {}) as FilterAndSortOptions;
		if (filters.sortBy === CUSTOM_ITEM_SORT_FIELD) {
			return;
		}

		await tx
			.update(views)
			.set({
				filters: {
					...filters,
					sortBy: CUSTOM_ITEM_SORT_FIELD,
					// Positions are stored in the order the user saw, so they only read
					// back as arranged when the sort runs ascending.
					sortDirection: "asc",
				},
			})
			.where(eq(views.id, viewId));
	});
}

/** Loads a view, or throws if it does not exist or belongs to someone else. */
export async function findOwnedView(viewId: number, userId: string) {
	const [view] = await db
		.select()
		.from(views)
		.where(and(eq(views.id, viewId), eq(views.userId, userId)));

	if (!view) {
		throw new Error(`View ${viewId} not found`);
	}

	return view;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Narrows a caller-supplied id list to the ones that are really the user's,
 * preserving the given order. De-duplicating first is what keeps a repeated id
 * from colliding on the (viewId, mediaItemId) primary key.
 */
async function filterToOwnedItemIds(
	mediaItemIds: number[],
	userId: string,
): Promise<number[]> {
	const uniqueIds = [...new Set(mediaItemIds)];
	if (uniqueIds.length === 0) {
		return [];
	}

	const ownedRows = await db
		.select({ id: mediaItems.id })
		.from(mediaItems)
		.where(
			and(eq(mediaItems.userId, userId), inArray(mediaItems.id, uniqueIds)),
		);
	const ownedIds = new Set(ownedRows.map((row) => row.id));

	return uniqueIds.filter((id) => ownedIds.has(id));
}
