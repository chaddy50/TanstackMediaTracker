import {
	and,
	asc,
	desc,
	eq,
	exists,
	ilike,
	inArray,
	isNotNull,
	isNull,
	notExists,
	or,
	type SQL,
	sql,
} from "drizzle-orm";

import { db } from "#/database/index";
import {
	creators,
	type FilterAndSortOptions,
	genres,
	type ItemSortField,
	mediaItemInstances,
	mediaItems,
	mediaItemTags,
	series,
	tags,
	viewItemOrder,
} from "#/database/schema";
import { MediaItemStatus } from "#/lib/enums";
import { BLANK_FILTER_VALUE } from "#/lib/genres/constants";
import { syncSeriesStatus } from "#/lib/queries/seriesQuery.server";
import {
	type ItemQueryItem,
	REORDERABLE_ITEM_LIMIT,
} from "#/lib/queries/types";
import { CUSTOM_ITEM_SORT_FIELD } from "#/lib/sortFields";

// ---------------------------------------------------------------------------
// buildCompletedDateCondition
// ---------------------------------------------------------------------------

function buildCompletedDateCondition(filters: FilterAndSortOptions) {
	let dateStart: string | null = null;
	let dateEnd: string | null = null;

	if (filters.completedThisYear) {
		const currentYear = new Date().getFullYear();
		dateStart = `${currentYear}-01-01`;
		dateEnd = `${currentYear}-12-31`;
	} else {
		dateStart = filters.completedDateStart ?? null;
		dateEnd = filters.completedDateEnd ?? null;
	}

	if (dateStart === null && dateEnd === null) {
		return undefined;
	}

	const startCondition =
		dateStart !== null
			? sql`${mediaItemInstances.completedAt}::date >= ${dateStart}::date`
			: undefined;
	const endCondition =
		dateEnd !== null
			? sql`${mediaItemInstances.completedAt}::date <= ${dateEnd}::date`
			: undefined;

	const dateConditions = [startCondition, endCondition].filter(
		(c) => c !== undefined,
	);

	return sql`EXISTS (
		SELECT 1 FROM ${mediaItemInstances}
		WHERE ${mediaItemInstances.mediaItemId} = ${mediaItems.id}
			AND ${mediaItemInstances.completedAt} IS NOT NULL
			AND ${and(...dateConditions)}
	)`;
}

// ---------------------------------------------------------------------------
// buildItemFilterConditions
// ---------------------------------------------------------------------------

function buildItemFilterConditions(
	filters: FilterAndSortOptions,
	userId: string,
) {
	return [
		eq(mediaItems.userId, userId),
		filters.mediaTypes?.length
			? inArray(mediaItems.type, filters.mediaTypes)
			: undefined,
		filters.statuses?.length
			? inArray(mediaItems.status, filters.statuses)
			: undefined,
		filters.purchaseStatuses?.length
			? inArray(mediaItems.purchaseStatus, filters.purchaseStatuses)
			: undefined,
		buildCompletedDateCondition(filters),
		buildTagCondition(filters.tags, userId),
		buildGenreCondition(filters.genres),
		filters.titleQuery
			? or(
					ilike(mediaItems.title, `%${filters.titleQuery}%`),
					ilike(series.name, `%${filters.titleQuery}%`),
					sql`${mediaItems.metadata}->>'author' ILIKE ${`%${filters.titleQuery}%`}`,
					sql`${mediaItems.metadata}->>'series' ILIKE ${`%${filters.titleQuery}%`}`,
				)
			: undefined,
		filters.creatorQuery
			? or(
					ilike(creators.name, `%${filters.creatorQuery}%`),
					sql`${mediaItems.metadata}->>'author' ILIKE ${`%${filters.creatorQuery}%`}`,
					sql`${mediaItems.metadata}->>'director' ILIKE ${`%${filters.creatorQuery}%`}`,
					sql`${mediaItems.metadata}->>'creator' ILIKE ${`%${filters.creatorQuery}%`}`,
					sql`${mediaItems.metadata}->>'developer' ILIKE ${`%${filters.creatorQuery}%`}`,
				)
			: undefined,
	].filter((c) => c !== undefined);
}

// ---------------------------------------------------------------------------
// buildGenreCondition
// ---------------------------------------------------------------------------

function buildGenreCondition(selectedGenres: string[] | undefined) {
	if (!selectedGenres?.length) {
		return undefined;
	}

	const hasBlank = selectedGenres.includes(BLANK_FILTER_VALUE);
	const realGenres = selectedGenres.filter(
		(genre) => genre !== BLANK_FILTER_VALUE,
	);

	const blankCondition = hasBlank ? isNull(mediaItems.genreId) : undefined;
	const realCondition = realGenres.length
		? inArray(genres.name, realGenres)
		: undefined;

	return combineWithOr(blankCondition, realCondition);
}

// ---------------------------------------------------------------------------
// buildTagCondition
// ---------------------------------------------------------------------------

function buildTagCondition(selectedTags: string[] | undefined, userId: string) {
	if (!selectedTags?.length) {
		return undefined;
	}

	const hasBlank = selectedTags.includes(BLANK_FILTER_VALUE);
	const realTags = selectedTags.filter((tag) => tag !== BLANK_FILTER_VALUE);

	const blankCondition = hasBlank
		? notExists(
				db
					.select({ one: sql`1` })
					.from(mediaItemTags)
					.where(eq(mediaItemTags.mediaItemId, mediaItems.id)),
			)
		: undefined;

	const realCondition = realTags.length
		? exists(
				db
					.select({ one: sql`1` })
					.from(mediaItemTags)
					.innerJoin(tags, eq(tags.id, mediaItemTags.tagId))
					.where(
						and(
							eq(mediaItemTags.mediaItemId, mediaItems.id),
							inArray(tags.name, realTags),
							eq(tags.userId, userId),
						),
					),
			)
		: undefined;

	return combineWithOr(blankCondition, realCondition);
}

// ---------------------------------------------------------------------------
// combineWithOr
// ---------------------------------------------------------------------------

function combineWithOr(...conditions: (SQL | undefined)[]) {
	const present = conditions.filter(
		(condition): condition is SQL => condition !== undefined,
	);
	if (present.length === 0) {
		return undefined;
	}
	if (present.length === 1) {
		return present[0];
	}
	return or(...present);
}

// ---------------------------------------------------------------------------
// normalizeSortField
// ---------------------------------------------------------------------------

/**
 * Resolves the sort field to use, handling a legacy value and the default.
 * Views saved before the "author" → "creator" rename still carry "author" —
 * treat it as "creator" so they continue to sort correctly.
 */
export function normalizeSortField(sortBy: string | undefined): ItemSortField {
	if ((sortBy as string) === "author") return "creator";
	return (sortBy as ItemSortField | undefined) ?? "series";
}

// ---------------------------------------------------------------------------
// buildItemSortClauses
// ---------------------------------------------------------------------------

function buildItemSortClauses(
	sortBy: ItemSortField,
	sortDirection: "asc" | "desc",
	viewId: number | undefined,
): SQL[] {
	const dir = sortDirection === "asc" ? asc : desc;

	const seriesKey = sql`COALESCE(${series.sortName}, ${mediaItems.seriesSortName}, ${mediaItems.sortTitle})`;
	const bySeriesThenTitle: SQL[] = [
		sql`${seriesKey} ASC`,
		sql`(NULLIF(${mediaItems.metadata}->>'seriesBookNumber', ''))::float ASC NULLS LAST`,
		sql`CASE WHEN ${mediaItems.seriesId} IS NOT NULL THEN ${mediaItems.releaseDate} END ASC NULLS LAST`,
		sql`CASE WHEN ${mediaItems.seriesId} IS NOT NULL THEN (${mediaItems.metadata}->>'firstPublishedAt')::timestamp END ASC NULLS LAST`,
		asc(mediaItems.sortTitle),
	];

	switch (sortBy) {
		case "title":
			return [dir(mediaItems.sortTitle)];

		case "updatedAt":
			return [dir(mediaItems.updatedAt), ...bySeriesThenTitle];

		case "status":
			return [dir(mediaItems.statusSortOrder), ...bySeriesThenTitle];

		case "creator": {
			// Fall back to JSONB fields for items not yet linked to a creator entity.
			// biome-ignore format: long SQL expression
			const creatorSortName = sql`COALESCE(${creators.sortName}, REGEXP_REPLACE(COALESCE(${mediaItems.metadata}->>'author', ${mediaItems.metadata}->>'director', ${mediaItems.metadata}->>'creator', ${mediaItems.metadata}->>'developer'), '^.* ', ''))`;
			return [
				sortDirection === "asc"
					? sql`${creatorSortName} ASC NULLS LAST`
					: sql`${creatorSortName} DESC NULLS LAST`,
				...bySeriesThenTitle,
			];
		}

		case "director":
			return [
				sortDirection === "asc"
					? sql`${mediaItems.metadata}->>'director' ASC NULLS LAST`
					: sql`${mediaItems.metadata}->>'director' DESC NULLS LAST`,
				...bySeriesThenTitle,
			];

		case "series":
			return sortDirection === "asc"
				? [
						sql`${seriesKey} ASC`,
						sql`(NULLIF(${mediaItems.metadata}->>'seriesBookNumber', ''))::float ASC NULLS LAST`,
						sql`CASE WHEN ${mediaItems.seriesId} IS NOT NULL THEN ${mediaItems.releaseDate} END ASC NULLS LAST`,
						sql`CASE WHEN ${mediaItems.seriesId} IS NOT NULL THEN (${mediaItems.metadata}->>'firstPublishedAt')::timestamp END ASC NULLS LAST`,
					]
				: [
						sql`${seriesKey} DESC`,
						sql`(NULLIF(${mediaItems.metadata}->>'seriesBookNumber', ''))::float DESC NULLS LAST`,
						sql`CASE WHEN ${mediaItems.seriesId} IS NOT NULL THEN ${mediaItems.releaseDate} END DESC NULLS LAST`,
						sql`CASE WHEN ${mediaItems.seriesId} IS NOT NULL THEN (${mediaItems.metadata}->>'firstPublishedAt')::timestamp END DESC NULLS LAST`,
					];

		case "rating":
			return [
				sortDirection === "asc"
					? sql`latest_instance.latest_rating ASC NULLS LAST`
					: sql`latest_instance.latest_rating DESC NULLS LAST`,
				...bySeriesThenTitle,
			];

		case "completedAt":
			return [
				sortDirection === "asc"
					? sql`latest_instance.latest_completed_at ASC NULLS LAST`
					: sql`latest_instance.latest_completed_at DESC NULLS LAST`,
				...bySeriesThenTitle,
			];

		case "releaseDate":
			return [
				sortDirection === "asc"
					? sql`${mediaItems.releaseDate} ASC NULLS LAST`
					: sql`${mediaItems.releaseDate} DESC NULLS LAST`,
				...bySeriesThenTitle,
			];

		case CUSTOM_ITEM_SORT_FIELD: {
			if (viewId === undefined) {
				throw new Error("Custom order requires a view id");
			}

			// A correlated subquery rather than a join: it keeps the query shape
			// identical for every sort mode, and the (view_id, media_item_id) primary
			// key makes the lookup a single index probe per row.
			const savedPosition = sql`(
				SELECT ${viewItemOrder.position}
				FROM ${viewItemOrder}
				WHERE ${viewItemOrder.viewId} = ${viewId}
					AND ${viewItemOrder.mediaItemId} = ${mediaItems.id}
			)`;

			// NULLS LAST in both directions: items the user has never placed belong
			// at the end regardless of direction, ordered among themselves by the
			// usual series → title fallback.
			return [
				sortDirection === "asc"
					? sql`${savedPosition} ASC NULLS LAST`
					: sql`${savedPosition} DESC NULLS LAST`,
				...bySeriesThenTitle,
			];
		}

		default:
			return [dir(mediaItems.sortTitle)];
	}
}

// ---------------------------------------------------------------------------
// runItemQuery
// ---------------------------------------------------------------------------

const PAGE_SIZE = 48;

export async function runItemQuery(
	filters: FilterAndSortOptions,
	userId: string,
	offset: number = 0,
	viewId?: number,
): Promise<{ items: ItemQueryItem[]; hasMore: boolean }> {
	const rawItems = await buildItemSelectQuery(filters, userId, viewId)
		.limit(PAGE_SIZE + 1)
		.offset(offset);

	const hasMore = rawItems.length > PAGE_SIZE;
	const items = rawItems.slice(0, PAGE_SIZE).map(toItemQueryItem);

	return { items, hasMore };
}

// ---------------------------------------------------------------------------
// runOrderableItemQuery
// ---------------------------------------------------------------------------

/**
 * Every item in a view, in its custom order, unpaginated. Backs reorder mode.
 */
export async function runOrderableItemQuery(
	filters: FilterAndSortOptions,
	userId: string,
	viewId: number,
): Promise<ItemQueryItem[]> {
	const rawItems = await buildItemSelectQuery(filters, userId, viewId).limit(
		REORDERABLE_ITEM_LIMIT,
	);

	return rawItems.map(toItemQueryItem);
}

// ---------------------------------------------------------------------------
// transitionReleasedItems
// ---------------------------------------------------------------------------

export async function transitionReleasedItems(userId: string) {
	const today = new Date().toISOString().slice(0, 10);
	const expiredItems = await db
		.select({ id: mediaItems.id, seriesId: mediaItems.seriesId })
		.from(mediaItems)
		.where(
			and(
				eq(mediaItems.userId, userId),
				eq(mediaItems.status, MediaItemStatus.WAITING_FOR_NEXT_RELEASE),
				isNotNull(mediaItems.expectedReleaseDate),
				sql`${mediaItems.expectedReleaseDate} <= ${today}`,
			),
		);

	if (expiredItems.length === 0) return;

	const expiredIds = expiredItems.map((i) => i.id);
	await db
		.update(mediaItems)
		.set({ status: MediaItemStatus.BACKLOG, expectedReleaseDate: null })
		.where(inArray(mediaItems.id, expiredIds));

	const affectedSeriesIds = [
		...new Set(
			expiredItems
				.map((i) => i.seriesId)
				.filter((id): id is number => id !== null),
		),
	];
	for (const seriesId of affectedSeriesIds) {
		await syncSeriesStatus(seriesId, userId);
	}
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** A row as it comes back from the select, before the rating is parsed. */
type ItemQueryRow = Omit<ItemQueryItem, "rating"> & {
	latestRating: string | null;
};

/**
 * The select, joins, filters and ordering shared by the paginated and the
 * unpaginated item queries. The caller applies its own limit/offset.
 */
function buildItemSelectQuery(
	filters: FilterAndSortOptions,
	userId: string,
	viewId: number | undefined,
) {
	const conditions = buildItemFilterConditions(filters, userId);
	const sortBy = resolveItemSortField(filters.sortBy, viewId);
	const sortClauses = buildItemSortClauses(
		sortBy,
		filters.sortDirection ?? "asc",
		viewId,
	);

	const lateralLatestInstance = sql`LATERAL (
		SELECT
			${mediaItemInstances.rating} AS latest_rating,
			${mediaItemInstances.completedAt} AS latest_completed_at
		FROM ${mediaItemInstances}
		WHERE ${mediaItemInstances.mediaItemId} = ${mediaItems.id}
			AND ${mediaItemInstances.completedAt} IS NOT NULL
		ORDER BY ${mediaItemInstances.id} DESC
		LIMIT 1
	) AS latest_instance`;

	return db
		.select({
			id: mediaItems.id,
			status: mediaItems.status,
			purchaseStatus: mediaItems.purchaseStatus,
			expectedReleaseDate: mediaItems.expectedReleaseDate,
			title: mediaItems.title,
			type: mediaItems.type,
			coverImageUrl: mediaItems.coverImageUrl,
			seriesId: mediaItems.seriesId,
			seriesName: series.name,
			creatorId: mediaItems.creatorId,
			creatorName: creators.name,
			genreId: mediaItems.genreId,
			genreName: genres.name,
			latestRating: sql<string | null>`latest_instance.latest_rating`,
			completedAt: sql<string | null>`latest_instance.latest_completed_at`,
		})
		.from(mediaItems)
		.leftJoin(series, eq(mediaItems.seriesId, series.id))
		.leftJoin(creators, eq(mediaItems.creatorId, creators.id))
		.leftJoin(genres, eq(mediaItems.genreId, genres.id))
		.leftJoin(lateralLatestInstance, sql`true`)
		.where(and(...conditions))
		.orderBy(...sortClauses);
}

/**
 * Resolves the sort field a query should actually use.
 *
 * Custom order is keyed on a view; without one — the library screen, or a
 * hand-typed search string carrying `sortBy=custom` — there is nothing to read,
 * so it falls back to the default ordering rather than failing.
 */
function resolveItemSortField(
	sortBy: string | undefined,
	viewId: number | undefined,
): ItemSortField {
	const requestedSortField = normalizeSortField(sortBy);
	if (requestedSortField === CUSTOM_ITEM_SORT_FIELD && viewId === undefined) {
		return "series";
	}
	return requestedSortField;
}

function toItemQueryItem({
	latestRating,
	...item
}: ItemQueryRow): ItemQueryItem {
	return { ...item, rating: parseFloat(latestRating ?? "") || 0 };
}
