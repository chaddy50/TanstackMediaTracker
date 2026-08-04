import type { ItemSortField, SeriesSortField } from "#/database/schema";

export const ITEM_SORT_FIELDS = [
	"title",
	"creator",
	"series",
	"director",
	"status",
	"rating",
	"completedAt",
	"releaseDate",
	"updatedAt",
] as const satisfies readonly ItemSortField[];

export const SERIES_SORT_FIELDS = [
	"name",
	"status",
	"nextItemStatus",
	"updatedAt",
	"rating",
	"itemCount",
] as const satisfies readonly SeriesSortField[];

/** The sort mode that reads a view's hand-built order out of `view_item_order`. */
export const CUSTOM_ITEM_SORT_FIELD = "custom" as const satisfies ItemSortField;

/**
 * The sort fields a custom view may use. Custom order lives here rather than in
 * `ITEM_SORT_FIELDS` because it is keyed on a view id — the library screen has
 * none, so it must never be offered there.
 */
export const VIEW_ITEM_SORT_FIELDS = [
	...ITEM_SORT_FIELDS,
	CUSTOM_ITEM_SORT_FIELD,
] as const satisfies readonly ItemSortField[];
