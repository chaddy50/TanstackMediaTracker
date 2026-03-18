import { sql } from "drizzle-orm";

import { db } from "#/db/index";
import { MediaItemType } from "#/server/enums";
import type { ReportDataPoint } from "../types";
import { buildMonthRange } from "../utils.server";

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
	startDate: string,
	endDate: string,
): Promise<ReportDataPoint[]> {
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
				AND inst.completed_at >= ${startDate}
				AND inst.completed_at <= ${endDate}
			ORDER BY mi.id, to_char(inst.completed_at, 'YYYY-MM'), inst.completed_at DESC
		) sub
		GROUP BY month
		ORDER BY month
	`);

	return buildMonthRange(rows.rows, startDate, endDate);
}
