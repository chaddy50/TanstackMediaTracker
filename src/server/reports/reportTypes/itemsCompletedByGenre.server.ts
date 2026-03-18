import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "#/db/index";
import {
	genres,
	mediaItemInstances,
	mediaItemMetadata,
	mediaItems,
} from "#/db/schema";
import type { MediaItemType } from "#/server/enums";
import type { GenreDataPoint } from "../types";

export async function fetchItemsCompletedByGenre(
	userId: string,
	startDate: string,
	endDate: string,
	mediaTypes?: MediaItemType[] | null,
): Promise<GenreDataPoint[]> {
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
				sql`${mediaItemInstances.completedAt} >= ${startDate}`,
				sql`${mediaItemInstances.completedAt} <= ${endDate}`,
				hasTypeFilter ? inArray(mediaItemMetadata.type, mediaTypes) : undefined,
			),
		)
		.groupBy(genres.name)
		.orderBy(sql`COUNT(DISTINCT ${mediaItems.id}) DESC`);

	return rows.map((row) => ({ genre: row.genre, value: Number(row.value) }));
}
