import type {
	MediaItemStatus,
	MediaItemType,
	PurchaseStatus,
} from "#/lib/enums";

/**
 * One media item as the item query returns it.
 *
 * Lives here rather than beside the query because components render these rows,
 * and a component may not import a `.server` module — doing so would pull the
 * whole query layer into the client bundle.
 */
export type ItemQueryItem = {
	id: number;
	status: MediaItemStatus;
	purchaseStatus: PurchaseStatus;
	expectedReleaseDate: string | null;
	title: string;
	type: MediaItemType;
	coverImageUrl: string | null;
	seriesId: number | null;
	seriesName: string | null;
	creatorId: number | null;
	creatorName: string | null;
	genreId: number | null;
	genreName: string | null;
	completedAt: string | null;
	rating: number;
};

/**
 * How many items reorder mode will load. Dragging must cover the whole result
 * set — a partial page would let one drop rewrite positions for items the user
 * cannot see — so the list is unpaginated and capped instead.
 */
export const REORDERABLE_ITEM_LIMIT = 500;
