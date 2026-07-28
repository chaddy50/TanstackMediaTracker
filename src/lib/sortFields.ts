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
