import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "#/db/index";
import {
	genres,
	mediaItemInstances,
	mediaItemMetadata,
	mediaItems,
} from "#/db/schema";
import { MediaItemType } from "#/lib/enums";
import type { GenreDataPoint, ReportDataPoint } from "./reports";

/**
 * This file uses the .server.ts convention — it must never be statically
 * imported by client-side code. Import it only from server function handler
 * bodies or other server-only modules.
 */

export function cutoffDateFromMonthCount(monthCount: number): string {
	const startDate = new Date();
	startDate.setMonth(startDate.getMonth() - (monthCount - 1));
	startDate.setDate(1);
	return startDate.toISOString().slice(0, 10);
}

/**
 * Builds an ascending array of the last N calendar months, pairing each with
 * its value from the provided rows. Months not present in rows default to 0.
 */
export function buildLastNMonths(
	rows: { month: string; value: number }[],
	monthCount: number,
): ReportDataPoint[] {
	const valueByMonth = new Map(rows.map((r) => [r.month, Number(r.value)]));
	const months: ReportDataPoint[] = [];
	const now = new Date();
	for (let offset = monthCount - 1; offset >= 0; offset--) {
		const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const key = `${year}-${month}`;
		months.push({ month: key, value: valueByMonth.get(key) ?? 0 });
	}
	return months;
}

/**
 * Returns the SQL expression that computes the progress metric for a given
 * media type. Reads from the `mim` (media_metadata) alias.
 *
 *   book       → pages read (pageCount)
 *   tv_show    → episodes watched (numberOfEpisodes)
 *   movie      → hours watched (runtime / 60)
 *   podcast    → hours listened (totalDuration / 60)
 *   video_game → hours played (timeToBeatNormally, fallback to timeToBeatHastily)
 */
export function getProgressByMonthSqlExpression(
	mediaType: MediaItemType,
): ReturnType<typeof sql> {
	switch (mediaType) {
		case MediaItemType.BOOK:
			return sql`(mim.metadata->>'pageCount')::float`;
		case MediaItemType.TV_SHOW:
			return sql`(mim.metadata->>'numberOfEpisodes')::float`;
		case MediaItemType.MOVIE:
			return sql`((mim.metadata->>'runtime')::float / 60.0)`;
		case MediaItemType.PODCAST:
			return sql`((mim.metadata->>'totalDuration')::float / 60.0)`;
		case MediaItemType.VIDEO_GAME:
			return sql`COALESCE((mim.metadata->>'timeToBeatNormally')::float, (mim.metadata->>'timeToBeatHastily')::float, 0)`;
		default:
			return sql`0`;
	}
}

/**
 * Progress by month — metric adapts to the single media type.
 * See getProgressByMonthSqlExpression for the per-type logic.
 */
export async function fetchProgressByMonth(
	userId: string,
	mediaType: MediaItemType,
	monthCount: number,
): Promise<ReportDataPoint[]> {
	const cutoffDate = cutoffDateFromMonthCount(monthCount);

	// Per-item metric expression (no aggregation — used in the dedup subquery).
	const progressByMonthExpression = getProgressByMonthSqlExpression(mediaType);

	// Deduplicate per (mediaItemId, month) before summing so that re-completing
	// the same item within a month doesn't double-count its metric — consistent
	// with the drill-down which shows unique items.
	const rows = await db.execute<{ month: string; value: number }>(sql`
		SELECT month, COALESCE(ROUND(SUM(progressByMonth)), 0) AS value
		FROM (
			SELECT DISTINCT ON (mi.id, to_char(inst.completed_at, 'YYYY-MM'))
				to_char(inst.completed_at, 'YYYY-MM') AS month,
				${progressByMonthExpression} AS progressByMonth
			FROM media_item_instances inst
			JOIN media_items mi ON inst.media_item_id = mi.id
			JOIN media_metadata mim ON mi.media_item_metadata_id = mim.id
			WHERE
				mi.user_id = ${userId}
				AND mim.type = ${mediaType}
				AND inst.completed_at IS NOT NULL
				AND inst.completed_at >= ${cutoffDate}
			ORDER BY mi.id, to_char(inst.completed_at, 'YYYY-MM'), inst.completed_at DESC
		) sub
		GROUP BY month
		ORDER BY month
	`);

	return buildLastNMonths(rows.rows, monthCount);
}

export async function fetchItemsCompletedByGenre(
	userId: string,
	monthCount: number,
	mediaTypes?: MediaItemType[] | null,
): Promise<GenreDataPoint[]> {
	const cutoffDate = cutoffDateFromMonthCount(monthCount);

	const hasTypeFilter = mediaTypes && mediaTypes.length > 0;

	const rows = await db
		.select({
			genre: genres.name,
			value: sql<number>`COUNT(DISTINCT ${mediaItems.id})`,
		})
		.from(mediaItemInstances)
		.innerJoin(mediaItems, eq(mediaItemInstances.mediaItemId, mediaItems.id))
		.innerJoin(
			mediaItemMetadata,
			eq(mediaItems.mediaItemMetadataId, mediaItemMetadata.id),
		)
		.innerJoin(genres, eq(mediaItems.genreId, genres.id))
		.where(
			and(
				eq(mediaItems.userId, userId),
				isNotNull(mediaItemInstances.completedAt),
				sql`${mediaItemInstances.completedAt} >= ${cutoffDate}`,
				hasTypeFilter ? inArray(mediaItemMetadata.type, mediaTypes) : undefined,
			),
		)
		.groupBy(genres.name)
		.orderBy(sql`COUNT(DISTINCT ${mediaItems.id}) DESC`);

	return rows.map((row) => ({ genre: row.genre, value: Number(row.value) }));
}
