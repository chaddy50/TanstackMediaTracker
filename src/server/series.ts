import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import {
	mediaItemInstances,
	mediaItemMetadata,
	mediaItemStatusEnum,
	mediaItems,
	series,
} from "#/db/schema";

export const getSeriesDetails = createServerFn({ method: "GET" })
	.inputValidator(z.object({ id: z.number() }))
	.handler(async ({ data: { id } }) => {
		const [row] = await db.select().from(series).where(eq(series.id, id));

		if (!row) throw new Error(`Series ${id} not found`);

		const items = await db
			.select({
				id: mediaItems.id,
				status: mediaItems.status,
				mediaItemMetadataId: mediaItemMetadata.id,
				title: mediaItemMetadata.title,
				type: mediaItemMetadata.type,
				coverImageUrl: mediaItemMetadata.coverImageUrl,
				metadata: mediaItemMetadata.metadata,
			})
			.from(mediaItems)
			.innerJoin(
				mediaItemMetadata,
				eq(mediaItems.mediaItemMetadataId, mediaItemMetadata.id),
			)
			.where(eq(mediaItems.seriesId, id))
			.orderBy(
				sql`
					NULLIF(media_metadata.metadata->>'seriesBookNumber', '')::numeric
					NULLS LAST
			  	`,
				mediaItemMetadata.releaseDate,
			);

		if (items.length === 0)
			return { ...row, rating: parseFloat(row.rating ?? "") || 0, items: [] };

		// Attach the most recent completed-instance rating to each item
		const itemIds = items.map((item) => item.id);
		const latestRatings = await db
			.selectDistinctOn([mediaItemInstances.mediaItemId], {
				mediaItemId: mediaItemInstances.mediaItemId,
				rating: mediaItemInstances.rating,
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

		return {
			...row,
			rating: parseFloat(row.rating ?? "") || 0,
			items: items.map((item) => ({
				...item,
				rating: parseFloat(ratingMap.get(item.id) ?? "") || 0,
			})),
		};
	});

export type SeriesDetails = Awaited<ReturnType<typeof getSeriesDetails>>;
export type SeriesItem = SeriesDetails["items"][number];

export const updateSeriesStatus = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			seriesId: z.number(),
			status: z.enum(mediaItemStatusEnum.enumValues),
		}),
	)
	.handler(async ({ data: { seriesId, status } }) => {
		await db.update(series).set({ status }).where(eq(series.id, seriesId));
	});

export const updateSeriesRating = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			seriesId: z.number(),
			rating: z.string().nullable(),
		}),
	)
	.handler(async ({ data: { seriesId, rating } }) => {
		await db
			.update(series)
			.set({ rating: rating ?? null })
			.where(eq(series.id, seriesId));
	});
