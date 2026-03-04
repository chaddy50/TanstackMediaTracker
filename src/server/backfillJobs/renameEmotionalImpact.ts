import { sql } from "drizzle-orm";

import { db } from "#/db/index";
import { mediaItemInstances, mediaItems } from "#/db/schema";

export async function runRenameEmotionalImpactBackfill(
	userId: string,
): Promise<{ processedCount: number }> {
	const result = await db.execute(sql`
		UPDATE ${mediaItemInstances}
		SET fiction_rating = (fiction_rating - 'emotionalImpact')
			|| jsonb_build_object('depth', fiction_rating->'emotionalImpact')
		WHERE fiction_rating ? 'emotionalImpact'
			AND media_item_id IN (
				SELECT id FROM ${mediaItems} WHERE user_id = ${userId}
			)
	`);

	return { processedCount: Number(result.rowCount ?? 0) };
}
