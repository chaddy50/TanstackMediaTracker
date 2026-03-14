import { db } from "#/db/index";
import {
	creators,
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
import { MediaItemStatus, NextItemStatus } from "#/lib/enums";
import {
	and,
	asc,
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

const PAGE_SIZE = 48;

export async function queryItemResults(
	filters: FilterAndSortOptions,
	userId: string,
	offset: number = 0,
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
		filters.creatorQuery
			? or(
					ilike(creators.name, `%${filters.creatorQuery}%`),
					sql`${mediaItemMetadata.metadata}->>'author' ILIKE ${`%${filters.creatorQuery}%`}`,
					sql`${mediaItemMetadata.metadata}->>'director' ILIKE ${`%${filters.creatorQuery}%`}`,
					sql`${mediaItemMetadata.metadata}->>'creator' ILIKE ${`%${filters.creatorQuery}%`}`,
					sql`${mediaItemMetadata.metadata}->>'developer' ILIKE ${`%${filters.creatorQuery}%`}`,
				)
			: undefined,
	].filter((c) => c !== undefined);

	// Handle legacy "author" value from saved views created before rename to "creator"
	const rawSortBy = (filters.sortBy as string) === "author" ? "creator" : filters.sortBy;
	const sortBy = (rawSortBy as ItemSortField | undefined) ?? "series";
	const sortDirection = filters.sortDirection ?? "asc";
	const dir = sortDirection === "asc" ? asc : desc;
	// Secondary tiebreakers: series name → book number → release date → firstPublishedAt → title.
	// COALESCE falls back to sortTitle for standalone items, so they sort by
	// name alongside series items rather than being pushed to a separate group.
	// firstPublishedAt (from JSONB) provides full timestamp precision as a tiebreaker
	// when releaseDate values are equal (e.g. podcast arcs stored with year-only dates).
	const seriesKey = sql`COALESCE(${series.sortName}, ${mediaItemMetadata.seriesSortName}, ${mediaItemMetadata.sortTitle})`;
	const bySeriesThenTitle = [
		sql`${seriesKey} ASC`,
		sql`(NULLIF(${mediaItemMetadata.metadata}->>'seriesBookNumber', ''))::float ASC NULLS LAST`,
		sql`CASE WHEN ${mediaItems.seriesId} IS NOT NULL THEN ${mediaItemMetadata.releaseDate} END ASC NULLS LAST`,
		sql`CASE WHEN ${mediaItems.seriesId} IS NOT NULL THEN (${mediaItemMetadata.metadata}->>'firstPublishedAt')::timestamp END ASC NULLS LAST`,
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
			case "creator":
			// Fall back to JSONB fields for items not yet linked to a creator entity
			// biome-ignore format: long SQL expression
			return sortDirection === "asc"
				? [sql`COALESCE(${creators.sortName}, REGEXP_REPLACE(COALESCE(${mediaItemMetadata.metadata}->>'author', ${mediaItemMetadata.metadata}->>'director', ${mediaItemMetadata.metadata}->>'creator', ${mediaItemMetadata.metadata}->>'developer'), '^.* ', '')) ASC NULLS LAST`, ...bySeriesThenTitle]
				: [sql`COALESCE(${creators.sortName}, REGEXP_REPLACE(COALESCE(${mediaItemMetadata.metadata}->>'author', ${mediaItemMetadata.metadata}->>'director', ${mediaItemMetadata.metadata}->>'creator', ${mediaItemMetadata.metadata}->>'developer'), '^.* ', '')) DESC NULLS LAST`, ...bySeriesThenTitle];
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
							sql`CASE WHEN ${mediaItems.seriesId} IS NOT NULL THEN (${mediaItemMetadata.metadata}->>'firstPublishedAt')::timestamp END ASC NULLS LAST`,
						]
					: [
							sql`${seriesKey} DESC`,
							sql`(NULLIF(${mediaItemMetadata.metadata}->>'seriesBookNumber', ''))::float DESC NULLS LAST`,
							sql`CASE WHEN ${mediaItems.seriesId} IS NOT NULL THEN ${mediaItemMetadata.releaseDate} END DESC NULLS LAST`,
							sql`CASE WHEN ${mediaItems.seriesId} IS NOT NULL THEN (${mediaItemMetadata.metadata}->>'firstPublishedAt')::timestamp END DESC NULLS LAST`,
						];
			case "rating":
				return sortDirection === "asc"
					? [sql`latest_instance.latest_rating ASC NULLS LAST`, ...bySeriesThenTitle]
					: [sql`latest_instance.latest_rating DESC NULLS LAST`, ...bySeriesThenTitle];
			case "completedAt":
				return sortDirection === "asc"
					? [sql`latest_instance.latest_completed_at ASC NULLS LAST`, ...bySeriesThenTitle]
					: [sql`latest_instance.latest_completed_at DESC NULLS LAST`, ...bySeriesThenTitle];
			default:
				return [dir(mediaItemMetadata.sortTitle)];
		}
	})();

	// LATERAL join to get the most recent completed instance per item in a single query.
	// This replaces the previous two-query pattern and enables SQL-level sorting by
	// rating and completedAt.
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
			isPurchased: mediaItems.isPurchased,
			expectedReleaseDate: mediaItems.expectedReleaseDate,
			mediaItemId: mediaItemMetadata.id,
			title: mediaItemMetadata.title,
			type: mediaItemMetadata.type,
			coverImageUrl: mediaItemMetadata.coverImageUrl,
			seriesId: mediaItems.seriesId,
			seriesName: series.name,
			creatorId: mediaItems.creatorId,
			creatorName: creators.name,
			latestRating: sql<string | null>`latest_instance.latest_rating`,
			completedAt: sql<string | null>`latest_instance.latest_completed_at`,
		})
		.from(mediaItems)
		.innerJoin(
			mediaItemMetadata,
			eq(mediaItems.mediaItemMetadataId, mediaItemMetadata.id),
		)
		.leftJoin(series, eq(mediaItems.seriesId, series.id))
		.leftJoin(creators, eq(mediaItems.creatorId, creators.id))
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

export async function querySeriesResults(
	filters: FilterAndSortOptions,
	userId: string,
	offset: number = 0,
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

	// Correlated subquery for item count — avoids a separate aggregation query
	// and enables SQL-level sorting by itemCount.
	// NOTE: ${series.id} cannot be used directly here — Drizzle strips the table
	// qualifier in query-builder context, so it becomes bare "id" which PostgreSQL
	// resolves to media_items.id inside the subquery instead of series.id.
	// sql.raw forces the fully-qualified reference needed for correct correlation.
	const itemCountSql = sql<number>`(
		SELECT COUNT(*)::int
		FROM ${mediaItems}
		WHERE ${mediaItems.seriesId} = ${sql.raw('"series"."id"')}
			AND ${mediaItems.userId} = ${userId}
	)`;

	const dbOrderClauses =
		sortBy === "updatedAt"
			? [dir(series.updatedAt)]
			: sortBy === "status"
				? [dir(series.statusSortOrder), asc(series.sortName)]
				: sortBy === "rating"
					? [sql`${series.rating} ${sql.raw(sortDirection === "asc" ? "ASC" : "DESC")} NULLS LAST`, asc(series.sortName)]
					: sortBy === "itemCount"
						? [sql`${itemCountSql} ${sql.raw(sortDirection === "asc" ? "ASC" : "DESC")} NULLS LAST`, asc(series.sortName)]
						: [dir(series.sortName)];

	const rawRows = await db
		.select({
			id: series.id,
			name: series.name,
			type: series.type,
			status: series.status,
			rating: series.rating,
			isComplete: series.isComplete,
			nextItemStatus: series.nextItemStatus,
			itemCount: itemCountSql,
		})
		.from(series)
		.where(and(...conditions))
		.orderBy(...dbOrderClauses)
		.limit(PAGE_SIZE + 1)
		.offset(offset);

	const hasMore = rawRows.length > PAGE_SIZE;
	const pageRows = rawRows.slice(0, PAGE_SIZE);

	const items = pageRows.map((s) => ({
		...s,
		rating: parseFloat(s.rating ?? "") || 0,
	}));

	return { items, hasMore };
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

export async function syncSeriesStatus(
	seriesId: number,
	userId: string,
	justCompleted = false,
) {
	const items = await db
		.select({ status: mediaItems.status })
		.from(mediaItems)
		.where(
			and(eq(mediaItems.seriesId, seriesId), eq(mediaItems.userId, userId)),
		);

	if (items.length === 0) return;

	const statuses = items.map((i) => i.status);
	const allDone = statuses.every(
		(s) => s === MediaItemStatus.COMPLETED || s === MediaItemStatus.DROPPED,
	);
	const remainingStatuses = statuses.filter(
		(s) => s !== MediaItemStatus.COMPLETED && s !== MediaItemStatus.DROPPED,
	);
	const allRemainingAreWaiting =
		remainingStatuses.length > 0 &&
		remainingStatuses.every((s) => s === MediaItemStatus.WAITING_FOR_NEXT_RELEASE);

	let newStatus: MediaItemStatus | null = null;
	if (statuses.some((s) => s === MediaItemStatus.IN_PROGRESS)) {
		newStatus = MediaItemStatus.IN_PROGRESS;
	} else if (allDone) {
		newStatus = MediaItemStatus.COMPLETED;
	} else if (allRemainingAreWaiting) {
		newStatus = MediaItemStatus.WAITING_FOR_NEXT_RELEASE;
	} else if (justCompleted) {
		// An item was just completed in a series that still has non-waiting items remaining —
		// treat the series as actively in progress.
		newStatus = MediaItemStatus.IN_PROGRESS;
	}

	if (newStatus === null) return;

	let newRating: string | null = null;
	if (newStatus === MediaItemStatus.COMPLETED) {
		const latestRatings = await db
			.selectDistinctOn([mediaItemInstances.mediaItemId], {
				rating: mediaItemInstances.rating,
			})
			.from(mediaItemInstances)
			.innerJoin(
				mediaItems,
				eq(mediaItemInstances.mediaItemId, mediaItems.id),
			)
			.where(
				and(
					eq(mediaItems.seriesId, seriesId),
					eq(mediaItems.userId, userId),
					isNotNull(mediaItemInstances.completedAt),
					isNotNull(mediaItemInstances.rating),
				),
			)
			.orderBy(mediaItemInstances.mediaItemId, desc(mediaItemInstances.id));

		const ratings = latestRatings
			.map((r) => parseFloat(r.rating ?? ""))
			.filter((r) => !Number.isNaN(r));
		if (ratings.length > 0) {
			const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
			newRating = average.toFixed(1);
		}
	}

	const seriesUpdates: Partial<typeof series.$inferInsert> = {
		status: newStatus,
		rating: newRating,
	};
	if (newStatus === MediaItemStatus.COMPLETED) {
		seriesUpdates.nextItemStatus = null;
	} else if (newStatus === MediaItemStatus.WAITING_FOR_NEXT_RELEASE) {
		seriesUpdates.nextItemStatus = NextItemStatus.WAITING_FOR_RELEASE;
	}

	await db
		.update(series)
		.set(seriesUpdates)
		.where(and(eq(series.id, seriesId), eq(series.userId, userId)));
}

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
			expiredItems.map((i) => i.seriesId).filter((id): id is number => id !== null),
		),
	];
	for (const seriesId of affectedSeriesIds) {
		await syncSeriesStatus(seriesId, userId);
	}
}
