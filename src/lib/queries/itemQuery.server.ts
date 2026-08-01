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
} from "#/database/schema";
import {
	MediaItemStatus,
	type MediaItemType,
	type PurchaseStatus,
} from "#/lib/enums";
import { BLANK_FILTER_VALUE } from "#/lib/genres/constants";
import { syncSeriesStatus } from "#/lib/queries/seriesQuery.server";

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

		default:
			return [dir(mediaItems.sortTitle)];
	}
}

// ---------------------------------------------------------------------------
// runItemQuery
// ---------------------------------------------------------------------------

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

const PAGE_SIZE = 48;

export async function runItemQuery(
	filters: FilterAndSortOptions,
	userId: string,
	offset: number = 0,
): Promise<{ items: ItemQueryItem[]; hasMore: boolean }> {
	const conditions = buildItemFilterConditions(filters, userId);
	const sortBy = normalizeSortField(filters.sortBy);
	const sortDirection = filters.sortDirection ?? "asc";
	const sortClauses = buildItemSortClauses(sortBy, sortDirection);

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

	const rawItems = await db
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
		.orderBy(...sortClauses)
		.limit(PAGE_SIZE + 1)
		.offset(offset);

	const hasMore = rawItems.length > PAGE_SIZE;
	const pageItems = rawItems.slice(0, PAGE_SIZE);

	const items = pageItems.map(({ latestRating, ...item }) => ({
		...item,
		rating: parseFloat(latestRating ?? "") || 0,
	}));

	return { items, hasMore };
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
