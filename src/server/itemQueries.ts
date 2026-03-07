import { db } from "#/db/index";
import {
	type FilterAndSortOptions,
	type ItemSortField,
	mediaItemInstances,
	mediaItemMetadata,
	mediaItems,
	mediaItemTags,
	series,
	type SeriesSortField,
	tags,
} from "#/db/schema";
import { MediaItemStatus } from "#/lib/enums";
import {
	and,
	asc,
	count,
	desc,
	eq,
	exists,
	ilike,
	inArray,
	isNotNull,
	or,
	type SQL,
	sql,
} from "drizzle-orm";


function buildCompletedYearCondition(filters: FilterAndSortOptions) {
	let yearStart: number | null = null;
	let yearEnd: number | null = null;

	if (filters.completedThisYear) {
		const currentYear = new Date().getFullYear();
		yearStart = currentYear;
		yearEnd = currentYear;
	} else {
		yearStart = filters.completedYearStart ?? null;
		yearEnd = filters.completedYearEnd ?? null;
	}

	if (yearStart === null && yearEnd === null) {
		return undefined;
	}

	const startCondition =
		yearStart !== null
			? sql`EXTRACT(YEAR FROM ${mediaItemInstances.completedAt}::date) >= ${yearStart}`
			: undefined;
	const endCondition =
		yearEnd !== null
			? sql`EXTRACT(YEAR FROM ${mediaItemInstances.completedAt}::date) <= ${yearEnd}`
			: undefined;

	const yearConditions = [startCondition, endCondition].filter(
		(c) => c !== undefined,
	);

	return sql`EXISTS (
		SELECT 1 FROM ${mediaItemInstances}
		WHERE ${mediaItemInstances.mediaItemId} = ${mediaItems.id}
			AND ${mediaItemInstances.completedAt} IS NOT NULL
			AND ${and(...yearConditions)}
	)`;
}

export async function queryItemResults(
	filters: FilterAndSortOptions,
	userId: string,
) {
	const conditions = [
		eq(mediaItems.userId, userId),
		filters.mediaTypes?.length
			? inArray(mediaItemMetadata.type, filters.mediaTypes)
			: undefined,
		filters.statuses?.length
			? inArray(mediaItems.status, filters.statuses)
			: undefined,
		filters.isPurchased !== undefined
			? eq(mediaItems.isPurchased, filters.isPurchased)
			: undefined,
		buildCompletedYearCondition(filters),
		filters.tags?.length
			? exists(
					db
						.select({ one: sql`1` })
						.from(mediaItemTags)
						.innerJoin(tags, eq(tags.id, mediaItemTags.tagId))
						.where(
							and(
								eq(mediaItemTags.mediaItemId, mediaItems.id),
								inArray(tags.name, filters.tags),
								eq(tags.userId, userId),
							),
						),
				)
			: undefined,
		filters.titleQuery
			? or(
					ilike(mediaItemMetadata.title, `%${filters.titleQuery}%`),
					ilike(series.name, `%${filters.titleQuery}%`),
					sql`${mediaItemMetadata.metadata}->>'author' ILIKE ${`%${filters.titleQuery}%`}`,
					sql`${mediaItemMetadata.metadata}->>'series' ILIKE ${`%${filters.titleQuery}%`}`,
				)
			: undefined,
	].filter((c) => c !== undefined);

	const sortBy = (filters.sortBy as ItemSortField | undefined) ?? "series";
	const sortDirection = filters.sortDirection ?? "asc";
	const dir = sortDirection === "asc" ? asc : desc;
	// Secondary tiebreakers: series name → book number → release date → title.
	// COALESCE falls back to sortTitle for standalone items, so they sort by
	// name alongside series items rather than being pushed to a separate group.
	const seriesKey = sql`COALESCE(${series.sortName}, ${mediaItemMetadata.seriesSortName}, ${mediaItemMetadata.sortTitle})`;
	const bySeriesThenTitle = [
		sql`${seriesKey} ASC`,
		sql`(NULLIF(${mediaItemMetadata.metadata}->>'seriesBookNumber', ''))::float ASC NULLS LAST`,
		sql`CASE WHEN ${mediaItems.seriesId} IS NOT NULL THEN ${mediaItemMetadata.releaseDate} END ASC NULLS LAST`,
		asc(mediaItemMetadata.sortTitle),
	];
	const sortClauses = ((): SQL[] => {
		switch (sortBy) {
			case "title":
				return [dir(mediaItemMetadata.sortTitle)];
			case "updatedAt":
				return [dir(mediaItems.updatedAt), ...bySeriesThenTitle];
			case "status":
				return [dir(mediaItems.statusSortOrder), ...bySeriesThenTitle];
			case "author":
				return sortDirection === "asc"
					? [sql`REGEXP_REPLACE(${mediaItemMetadata.metadata}->>'author', '^.* ', '') ASC NULLS LAST`, ...bySeriesThenTitle]
					: [sql`REGEXP_REPLACE(${mediaItemMetadata.metadata}->>'author', '^.* ', '') DESC NULLS LAST`, ...bySeriesThenTitle];
			case "director":
				return sortDirection === "asc"
					? [sql`${mediaItemMetadata.metadata}->>'director' ASC NULLS LAST`, ...bySeriesThenTitle]
					: [sql`${mediaItemMetadata.metadata}->>'director' DESC NULLS LAST`, ...bySeriesThenTitle];
			case "series":
				return sortDirection === "asc"
					? [
							sql`${seriesKey} ASC`,
							sql`(NULLIF(${mediaItemMetadata.metadata}->>'seriesBookNumber', ''))::float ASC NULLS LAST`,
							sql`CASE WHEN ${mediaItems.seriesId} IS NOT NULL THEN ${mediaItemMetadata.releaseDate} END ASC NULLS LAST`,
						]
					: [
							sql`${seriesKey} DESC`,
							sql`(NULLIF(${mediaItemMetadata.metadata}->>'seriesBookNumber', ''))::float DESC NULLS LAST`,
							sql`CASE WHEN ${mediaItems.seriesId} IS NOT NULL THEN ${mediaItemMetadata.releaseDate} END DESC NULLS LAST`,
						];
			default:
				return [dir(mediaItemMetadata.sortTitle)];
		}
	})();

	const items = await db
		.select({
			id: mediaItems.id,
			status: mediaItems.status,
			isPurchased: mediaItems.isPurchased,
			mediaItemId: mediaItemMetadata.id,
			title: mediaItemMetadata.title,
			type: mediaItemMetadata.type,
			coverImageUrl: mediaItemMetadata.coverImageUrl,
			seriesId: mediaItems.seriesId,
			seriesName: series.name,
		})
		.from(mediaItems)
		.innerJoin(
			mediaItemMetadata,
			eq(mediaItems.mediaItemMetadataId, mediaItemMetadata.id),
		)
		.leftJoin(series, eq(mediaItems.seriesId, series.id))
		.where(and(...conditions))
		.orderBy(...sortClauses);

	if (items.length === 0) {
		return [];
	}

	const itemIds = items.map((item) => item.id);
	const latestRatings = await db
		.selectDistinctOn([mediaItemInstances.mediaItemId], {
			mediaItemId: mediaItemInstances.mediaItemId,
			rating: mediaItemInstances.rating,
			completedAt: mediaItemInstances.completedAt,
		})
		.from(mediaItemInstances)
		.where(
			and(
				inArray(mediaItemInstances.mediaItemId, itemIds),
				isNotNull(mediaItemInstances.completedAt),
			),
		)
		.orderBy(mediaItemInstances.mediaItemId, desc(mediaItemInstances.id));

	const ratingMap = new Map(
		latestRatings.map((r) => [r.mediaItemId, r.rating]),
	);
	const completedAtMap = new Map(
		latestRatings.map((r) => [r.mediaItemId, r.completedAt]),
	);

	const enrichedItems = items.map((item) => ({
		...item,
		rating: parseFloat(ratingMap.get(item.id) ?? "") || 0,
		completedAt: completedAtMap.get(item.id) ?? null,
	}));

	if (sortBy === "rating") {
		enrichedItems.sort((a, b) =>
			sortDirection === "desc" ? b.rating - a.rating : a.rating - b.rating,
		);
	} else if (sortBy === "completedAt") {
		enrichedItems.sort((a, b) => {
			if (!a.completedAt && !b.completedAt) {
				return 0;
			}
			if (!a.completedAt) {
				return 1;
			}
			if (!b.completedAt) {
				return -1;
			}
			return sortDirection === "desc"
				? b.completedAt.localeCompare(a.completedAt)
				: a.completedAt.localeCompare(b.completedAt);
		});
	}

	return enrichedItems;
}

export async function querySeriesResults(
	filters: FilterAndSortOptions,
	userId: string,
) {
	const conditions = [
		eq(series.userId, userId),
		filters.mediaTypes?.length
			? inArray(series.type, filters.mediaTypes)
			: undefined,
		filters.statuses?.length
			? inArray(series.status, filters.statuses)
			: undefined,
		filters.isSeriesComplete !== undefined
			? eq(series.isComplete, filters.isSeriesComplete)
			: undefined,
	].filter((c) => c !== undefined);

	const sortBy = (filters.sortBy as SeriesSortField | undefined) ?? "name";
	const sortDirection = filters.sortDirection ?? "asc";
	const dir = sortDirection === "asc" ? asc : desc;

	const dbOrderClauses =
		sortBy === "updatedAt"
			? [dir(series.updatedAt)]
			: sortBy === "status"
				? [dir(series.statusSortOrder), asc(series.sortName)]
				: [dir(series.sortName)];

	const seriesRows = await db
		.select({
			id: series.id,
			name: series.name,
			type: series.type,
			status: series.status,
			rating: series.rating,
			isComplete: series.isComplete,
			nextItemStatus: series.nextItemStatus,
		})
		.from(series)
		.where(and(...conditions))
		.orderBy(...dbOrderClauses);

	if (seriesRows.length === 0) {
		return [];
	}

	const seriesIds = seriesRows.map((s) => s.id);
	const itemCounts = await db
		.select({
			seriesId: mediaItems.seriesId,
			itemCount: count(),
		})
		.from(mediaItems)
		.where(
			and(
				inArray(mediaItems.seriesId, seriesIds),
				eq(mediaItems.userId, userId),
			),
		)
		.groupBy(mediaItems.seriesId);

	const countMap = new Map(itemCounts.map((r) => [r.seriesId, r.itemCount]));

	const enrichedSeries = seriesRows.map((s) => ({
		...s,
		rating: parseFloat(s.rating ?? "") || 0,
		itemCount: countMap.get(s.id) ?? 0,
	}));

	if (sortBy === "rating") {
		enrichedSeries.sort((a, b) =>
			sortDirection === "desc" ? b.rating - a.rating : a.rating - b.rating,
		);
	} else if (sortBy === "itemCount") {
		enrichedSeries.sort((a, b) =>
			sortDirection === "desc"
				? b.itemCount - a.itemCount
				: a.itemCount - b.itemCount,
		);
	}

	return enrichedSeries;
}

/**
 * Returns the "next" item in a series — the first backlog item that comes after
 * the last item the user has engaged with (anything other than backlog).
 * Returns null if there is no such item.
 */
export async function getNextItemInSeries(
	seriesId: number,
	userId: string,
): Promise<{ id: number; isPurchased: boolean } | null> {
	const items = await db
		.select({
			id: mediaItems.id,
			status: mediaItems.status,
			isPurchased: mediaItems.isPurchased,
		})
		.from(mediaItems)
		.innerJoin(mediaItemMetadata, eq(mediaItems.mediaItemMetadataId, mediaItemMetadata.id))
		.where(and(eq(mediaItems.seriesId, seriesId), eq(mediaItems.userId, userId)))
		.orderBy(
			sql`(NULLIF(${mediaItemMetadata.metadata}->>'seriesBookNumber', ''))::float ASC NULLS LAST`,
			asc(mediaItemMetadata.releaseDate),
			asc(mediaItemMetadata.sortTitle),
		);

	let lastEngagedIndex = -1;
	for (let index = 0; index < items.length; index++) {
		if (items[index].status !== MediaItemStatus.BACKLOG) {
			lastEngagedIndex = index;
		}
	}

	if (lastEngagedIndex === -1) {
		return null;
	}

	const nextItem = items.slice(lastEngagedIndex + 1).find(
		(item) => item.status === MediaItemStatus.BACKLOG,
	);

	return nextItem ?? null;
}
