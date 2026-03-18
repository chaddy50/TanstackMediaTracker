import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";

import { db } from "#/db/index";
import { mediaItemInstances, mediaItems, series } from "#/db/schema";
import { MediaItemStatus } from "#/server/enums";

export async function runSeriesRatingsBackfill(
	userId: string,
): Promise<{ processedCount: number }> {
	let processedCount = 0;

	const completedSeries = await db
		.select({ id: series.id })
		.from(series)
		.where(
			and(
				eq(series.userId, userId),
				eq(series.status, MediaItemStatus.COMPLETED),
			),
		);

	for (const seriesRow of completedSeries) {
		const items = await db
			.select({ id: mediaItems.id })
			.from(mediaItems)
			.where(
				and(
					eq(mediaItems.seriesId, seriesRow.id),
					eq(mediaItems.userId, userId),
				),
			);

		if (items.length === 0) continue;

		const itemIds = items.map((item) => item.id);

		const latestRatings = await db
			.selectDistinctOn([mediaItemInstances.mediaItemId], {
				rating: mediaItemInstances.rating,
			})
			.from(mediaItemInstances)
			.where(
				and(
					inArray(mediaItemInstances.mediaItemId, itemIds),
					isNotNull(mediaItemInstances.completedAt),
					isNotNull(mediaItemInstances.rating),
				),
			)
			.orderBy(mediaItemInstances.mediaItemId, desc(mediaItemInstances.id));

		const ratings = latestRatings
			.map((r) => parseFloat(r.rating ?? ""))
			.filter((r) => !Number.isNaN(r));

		const newRating =
			ratings.length > 0
				? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
				: null;

		await db
			.update(series)
			.set({ rating: newRating })
			.where(eq(series.id, seriesRow.id));

		processedCount++;
	}

	return { processedCount };
}
