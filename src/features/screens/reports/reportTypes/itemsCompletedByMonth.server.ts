import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "#/database/index";
import { mediaItemInstances, mediaItems } from "#/database/schema";
import type { MediaItemType } from "#/lib/enums";
import type { ReportDataPoint } from "../types";
import { buildMonthRange } from "../utils.server";

export async function fetchItemsCompletedByMonth(
	userId: string,
	startDate: string,
	endDate: string,
	mediaTypes?: MediaItemType[] | null,
): Promise<ReportDataPoint[]> {
	const hasTypeFilter = mediaTypes && mediaTypes.length > 0;

	const rows = await db
		.select({
			month: sql<string>`to_char(${mediaItemInstances.completedAt}, 'YYYY-MM')`,
			value: sql<number>`COUNT(DISTINCT ${mediaItems.id})`,
		})
		.from(mediaItemInstances)
		.innerJoin(mediaItems, eq(mediaItemInstances.mediaItemId, mediaItems.id))
		.where(
			and(
				eq(mediaItems.userId, userId),
				isNotNull(mediaItemInstances.completedAt),
				sql`${mediaItemInstances.completedAt} >= ${startDate}`,
				sql`${mediaItemInstances.completedAt} <= ${endDate}`,
				hasTypeFilter ? inArray(mediaItems.type, mediaTypes) : undefined,
			),
		)
		.groupBy(sql`to_char(${mediaItemInstances.completedAt}, 'YYYY-MM')`)
		.orderBy(sql`to_char(${mediaItemInstances.completedAt}, 'YYYY-MM')`);

	return buildMonthRange(rows, startDate, endDate);
}
