import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import {
	mediaItemInstances,
	mediaItemMetadata,
	mediaItemStatusEnum,
	mediaItems,
	mediaTypeEnum,
	series,
} from "#/db/schema";
import { MediaItemStatus } from "#/lib/enums";

export const getSeriesListByType = createServerFn({ method: "GET" })
	.inputValidator(z.object({ type: z.enum(mediaTypeEnum.enumValues) }))
	.handler(async ({ data: { type } }) => {
		return db
			.select({ id: series.id, name: series.name })
			.from(series)
			.where(eq(series.type, type))
			.orderBy(asc(series.name));
	});

export const getSeriesDetails = createServerFn({ method: "GET" })
	.inputValidator(z.object({ id: z.number() }))
	.handler(async ({ data: { id } }) => {
		const [row] = await db.select().from(series).where(eq(series.id, id));

		if (!row) throw new Error(`Series ${id} not found`);

		const items = await db
			.select({
				id: mediaItems.id,
				status: mediaItems.status,
				isPurchased: mediaItems.isPurchased,
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

		if (items.length === 0) {
			return {
				...row,
				status: row.status,
				isStatusAutoOverridden: false,
				rating: parseFloat(row.rating ?? "") || 0,
				items: [],
			};
		}

		// Attach the most recent completed-instance rating to each item,
		// and also capture completedAt for the auto-override check.
		const itemIds = items.map((item) => item.id);
		const latestRatings = await db
			.selectDistinctOn([mediaItemInstances.mediaItemId], {
				mediaItemId: mediaItemInstances.mediaItemId,
				rating: mediaItemInstances.rating,
				completedAt: mediaItemInstances.completedAt,
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

		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		const cutoffDate = thirtyDaysAgo.toISOString().slice(0, 10);

		const isStatusAutoOverridden = (
			items.some((item) => item.status === MediaItemStatus.IN_PROGRESS) ||
			latestRatings.some((r) => r.completedAt !== null && r.completedAt >= cutoffDate)
		);

		return {
			...row,
			status: isStatusAutoOverridden ? MediaItemStatus.IN_PROGRESS : row.status,
			isStatusAutoOverridden,
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

export const updateSeriesMetadata = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			seriesId: z.number(),
			name: z.string(),
			description: z.string().optional(),
			isComplete: z.boolean(),
		}),
	)
	.handler(async ({ data: { seriesId, name, description, isComplete } }) => {
		const [currentSeries] = await db
			.select({ name: series.name })
			.from(series)
			.where(eq(series.id, seriesId));

		await db
			.update(series)
			.set({ name, description: description || null, isComplete })
			.where(eq(series.id, seriesId));

		// If the name changed, sync it into each item's metadata JSONB so the
		// series name shown on media item detail pages stays consistent.
		if (currentSeries && currentSeries.name !== name) {
			await db
				.update(mediaItemMetadata)
				.set({
					metadata: sql`jsonb_set(${mediaItemMetadata.metadata}, '{series}', ${JSON.stringify(name)}::jsonb)`,
				})
				.where(
					inArray(
						mediaItemMetadata.id,
						db
							.select({ id: mediaItems.mediaItemMetadataId })
							.from(mediaItems)
							.where(eq(mediaItems.seriesId, seriesId)),
					),
				);
		}
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
