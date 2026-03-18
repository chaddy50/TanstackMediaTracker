import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "#/db/index";
import { mediaItemInstances, mediaItemMetadata, mediaItems } from "#/db/schema";
import type { MediaItemType } from "#/lib/enums";
import type { ReportDataPoint } from "../types";
import { buildLastNMonths, cutoffDateFromMonthCount } from "../utils.server";

export async function fetchItemsCompletedByMonth(
	userId: string,
	monthCount: number,
	mediaTypes?: MediaItemType[] | null,
): Promise<ReportDataPoint[]> {
	const cutoffDate = cutoffDateFromMonthCount(monthCount);

	const hasTypeFilter = mediaTypes && mediaTypes.length > 0;

	const rows = await db
		.select({
			month: sql<string>`to_char(${mediaItemInstances.completedAt}, 'YYYY-MM')`,
			value: sql<number>`COUNT(DISTINCT ${mediaItems.id})`,
		})
		.from(mediaItemInstances)
		.innerJoin(mediaItems, eq(mediaItemInstances.mediaItemId, mediaItems.id))
		.innerJoin(
			mediaItemMetadata,
			eq(mediaItems.mediaItemMetadataId, mediaItemMetadata.id),
		)
		.where(
			and(
				eq(mediaItems.userId, userId),
				isNotNull(mediaItemInstances.completedAt),
				sql`${mediaItemInstances.completedAt} >= ${cutoffDate}`,
				hasTypeFilter ? inArray(mediaItemMetadata.type, mediaTypes) : undefined,
			),
		)
		.groupBy(sql`to_char(${mediaItemInstances.completedAt}, 'YYYY-MM')`)
		.orderBy(sql`to_char(${mediaItemInstances.completedAt}, 'YYYY-MM')`);

	return buildLastNMonths(rows, monthCount);
}
