import { sql } from "drizzle-orm";

import { db } from "#/db/index";
import { series } from "#/db/schema";

export async function runNextItemStatusBackfill(
	userId: string,
): Promise<{ processedCount: number }> {
	// Rule 1: Series already marked "Waiting for Next Release" → waiting_for_release
	const waitingResult = await db.execute(sql`
		UPDATE ${series}
		SET next_item_status = 'waiting_for_release'
		WHERE user_id = ${userId}
			AND status = 'waiting_for_next_release'
			AND next_item_status IS NULL
	`);

	// Rule 2: For other active series, find the "next item":
	// - For started series (at least one non-backlog item): first backlog item after the last engaged item
	// - For unstarted series (all items are backlog): first item by order
	// If that item is purchased → 'purchased', otherwise → 'available'.
	const nextItemResult = await db.execute(sql`
		WITH ordered_items AS (
			SELECT
				mi.id,
				mi.series_id,
				mi.status,
				mi.is_purchased,
				ROW_NUMBER() OVER (
					PARTITION BY mi.series_id
					ORDER BY
						(NULLIF(mm.metadata->>'seriesBookNumber', ''))::float NULLS LAST,
						mm.release_date NULLS LAST,
						mm.sort_title
				) AS rn
			FROM media_items mi
			JOIN media_metadata mm ON mi.media_item_metadata_id = mm.id
			WHERE mi.series_id IN (
				SELECT id FROM ${series}
				WHERE user_id = ${userId}
					AND status NOT IN ('waiting_for_next_release', 'done', 'dropped')
					AND next_item_status IS NULL
			)
			AND mi.user_id = ${userId}
		),
		last_engaged AS (
			SELECT series_id, MAX(rn) AS last_rn
			FROM ordered_items
			WHERE status != 'backlog'
			GROUP BY series_id
		),
		next_backlog AS (
			-- Started series: first backlog item after the last engaged item
			SELECT series_id, is_purchased FROM (
				SELECT DISTINCT ON (oi.series_id)
					oi.series_id,
					oi.is_purchased
				FROM ordered_items oi
				JOIN last_engaged le ON oi.series_id = le.series_id
				WHERE oi.status = 'backlog'
					AND oi.rn > le.last_rn
				ORDER BY oi.series_id, oi.rn
			) AS started
			UNION ALL
			-- Unstarted series: first item by order (rn = 1 is already unique per series)
			SELECT series_id, is_purchased
			FROM ordered_items
			WHERE series_id NOT IN (SELECT series_id FROM last_engaged)
				AND rn = 1
		)
		UPDATE ${series} s
		SET next_item_status = CASE
			WHEN nb.is_purchased THEN 'purchased'::next_item_status
			ELSE 'available'::next_item_status
		END
		FROM next_backlog nb
		WHERE s.id = nb.series_id
			AND s.user_id = ${userId}
	`);

	const processedCount =
		Number(waitingResult.rowCount ?? 0) +
		Number(nextItemResult.rowCount ?? 0);

	return { processedCount };
}
