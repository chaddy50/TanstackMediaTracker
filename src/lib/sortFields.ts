import type { ItemSortField, SeriesSortField } from "#/db/schema";

export const ITEM_SORT_FIELDS = [
	"title",
	"author",
	"series",
	"director",
	"status",
	"rating",
	"completedAt",
	"updatedAt",
] as const satisfies readonly ItemSortField[];

export const SERIES_SORT_FIELDS = [
	"name",
	"updatedAt",
	"rating",
	"itemCount",
] as const satisfies readonly SeriesSortField[];
