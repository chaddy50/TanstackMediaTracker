import { createServerFn } from "@tanstack/react-start";
import { asc, count, eq, sql } from "drizzle-orm";
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

function inferStatusAfterInstanceEdit(
	startedAt?: string | null,
	completedAt?: string | null,
) {
	if (completedAt) return MediaItemStatus.COMPLETED;
	if (startedAt) return MediaItemStatus.IN_PROGRESS;
	return null;
}

type InstanceDateRow = { startedAt: string | null; completedAt: string | null };

function inferStatusAfterInstanceDelete(remainingInstances: InstanceDateRow[]) {
	if (remainingInstances.some((i) => i.startedAt && !i.completedAt))
		return MediaItemStatus.IN_PROGRESS;
	if (remainingInstances.some((i) => i.completedAt))
		return MediaItemStatus.COMPLETED;
	return MediaItemStatus.BACKLOG;
}

export const getMediaItemDetails = createServerFn({ method: "GET" })
	.inputValidator(z.object({ id: z.number() }))
	.handler(async ({ data: { id } }) => {
		const [row] = await db
			.select({
				id: mediaItems.id,
				status: mediaItems.status,
				isPurchased: mediaItems.isPurchased,
				seriesId: mediaItems.seriesId,
				seriesName: series.name,
				metadataId: mediaItemMetadata.id,
				title: mediaItemMetadata.title,
				type: mediaItemMetadata.type,
				description: mediaItemMetadata.description,
				coverImageUrl: mediaItemMetadata.coverImageUrl,
				releaseDate: mediaItemMetadata.releaseDate,
				metadata: mediaItemMetadata.metadata,
			})
			.from(mediaItems)
			.innerJoin(
				mediaItemMetadata,
				eq(mediaItemMetadata.id, mediaItems.mediaItemMetadataId),
			)
			.leftJoin(series, eq(mediaItems.seriesId, series.id))
			.where(eq(mediaItems.id, id));

		if (!row) throw new Error(`Entry ${id} not found`);

		const instances = await db
			.select({
				id: mediaItemInstances.id,
				rating: mediaItemInstances.rating,
				fictionRating: mediaItemInstances.fictionRating,
				reviewText: mediaItemInstances.reviewText,
				startedAt: mediaItemInstances.startedAt,
				completedAt: mediaItemInstances.completedAt,
			})
			.from(mediaItemInstances)
			.where(eq(mediaItemInstances.mediaItemId, id))
			.orderBy(asc(mediaItemInstances.id));

		return {
			...row,
			instances: instances.map((i) => ({
				...i,
				rating: parseFloat(i.rating ?? "") || 0,
			})),
		};
	});

export type MediaItemDetails = Awaited<ReturnType<typeof getMediaItemDetails>>;

export const updateMediaItemStatus = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			mediaItemId: z.number(),
			status: z.enum(mediaItemStatusEnum.enumValues),
		}),
	)
	.handler(async ({ data: { mediaItemId, status } }) => {
		await db
			.update(mediaItems)
			.set({ status })
			.where(eq(mediaItems.id, mediaItemId));
	});

export const saveInstance = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			mediaItemId: z.number(),
			instanceId: z.number().optional(),
			rating: z.string().optional(),
			fictionRating: z
				.object({
					setting: z.object({ rating: z.number(), comment: z.string().optional() }),
					character: z.object({ rating: z.number(), comment: z.string().optional() }),
					plot: z.object({ rating: z.number(), comment: z.string().optional() }),
					enjoyment: z.object({ rating: z.number(), comment: z.string().optional() }),
					emotionalImpact: z.object({ rating: z.number(), comment: z.string().optional() }),
				})
				.optional(),
			reviewText: z.string().optional(),
			startedAt: z.string().optional(),
			completedAt: z.string().optional(),
		}),
	)
	.handler(
		async ({
			data: {
				mediaItemId,
				instanceId,
				rating,
				fictionRating,
				reviewText,
				startedAt,
				completedAt,
			},
		}) => {
			const values = {
				rating: rating ?? null,
				fictionRating: fictionRating ?? null,
				reviewText: reviewText || null,
				startedAt: startedAt || null,
				completedAt: completedAt || null,
			};
			if (instanceId) {
				await db
					.update(mediaItemInstances)
					.set(values)
					.where(eq(mediaItemInstances.id, instanceId));
			} else {
				await db
					.insert(mediaItemInstances)
					.values({ mediaItemId: mediaItemId, ...values });
			}

			const newStatus = inferStatusAfterInstanceEdit(startedAt, completedAt);
			if (newStatus) {
				await db
					.update(mediaItems)
					.set({ status: newStatus })
					.where(eq(mediaItems.id, mediaItemId));
			}
		},
	);

export const deleteInstance = createServerFn({ method: "POST" })
	.inputValidator(z.object({ instanceId: z.number() }))
	.handler(async ({ data: { instanceId } }) => {
		const [instanceBeingDeleted] = await db
			.select({
				mediaItemId: mediaItemInstances.mediaItemId,
			})
			.from(mediaItemInstances)
			.where(eq(mediaItemInstances.id, instanceId));

		if (!instanceBeingDeleted) return;

		await db
			.delete(mediaItemInstances)
			.where(eq(mediaItemInstances.id, instanceId));

		const remainingInstances = await db
			.select({
				startedAt: mediaItemInstances.startedAt,
				completedAt: mediaItemInstances.completedAt,
			})
			.from(mediaItemInstances)
			.where(
				eq(mediaItemInstances.mediaItemId, instanceBeingDeleted.mediaItemId),
			);

		await db
			.update(mediaItems)
			.set({ status: inferStatusAfterInstanceDelete(remainingInstances) })
			.where(eq(mediaItems.id, instanceBeingDeleted.mediaItemId));
	});

export const updateMediaItemMetadata = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			metadataId: z.number(),
			title: z.string(),
			description: z.string().optional(),
			coverImageUrl: z.string().optional(),
			releaseDate: z.string().optional(),
			metadata: z.any(),
		}),
	)
	.handler(async ({ data }) => {
		await db
			.update(mediaItemMetadata)
			.set({
				title: data.title,
				description: data.description || null,
				coverImageUrl: data.coverImageUrl || null,
				releaseDate: data.releaseDate || null,
				metadata: data.metadata,
			})
			.where(eq(mediaItemMetadata.id, data.metadataId));
	});

export const updateMediaItemSeries = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			mediaItemId: z.number(),
			metadataId: z.number(),
			type: z.enum(mediaTypeEnum.enumValues),
			seriesId: z.number().nullable(),
			newSeriesName: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		let resolvedSeriesId = data.seriesId;
		let resolvedSeriesName: string | null = null;

		if (data.newSeriesName) {
			const [newSeries] = await db
				.insert(series)
				.values({ name: data.newSeriesName, type: data.type })
				.returning({ id: series.id });
			if (!newSeries) throw new Error("Failed to create series");
			resolvedSeriesId = newSeries.id;
			resolvedSeriesName = data.newSeriesName;
		} else if (data.seriesId !== null) {
			const [existing] = await db
				.select({ name: series.name })
				.from(series)
				.where(eq(series.id, data.seriesId));
			resolvedSeriesName = existing?.name ?? null;
		}

		await db
			.update(mediaItems)
			.set({ seriesId: resolvedSeriesId })
			.where(eq(mediaItems.id, data.mediaItemId));

		if (resolvedSeriesName) {
			await db
				.update(mediaItemMetadata)
				.set({
					metadata: sql`jsonb_set(coalesce(${mediaItemMetadata.metadata}, '{}'), '{series}', ${JSON.stringify(resolvedSeriesName)}::jsonb)`,
				})
				.where(eq(mediaItemMetadata.id, data.metadataId));
		} else {
			await db
				.update(mediaItemMetadata)
				.set({
					metadata: sql`${mediaItemMetadata.metadata} - 'series'`,
				})
				.where(eq(mediaItemMetadata.id, data.metadataId));
		}
	});

export const togglePurchased = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			mediaItemId: z.number(),
			isPurchased: z.boolean(),
		}),
	)
	.handler(async ({ data: { mediaItemId, isPurchased } }) => {
		await db
			.update(mediaItems)
			.set({ isPurchased })
			.where(eq(mediaItems.id, mediaItemId));
	});

export const removeFromLibrary = createServerFn({ method: "POST" })
	.inputValidator(z.object({ metadataId: z.number() }))
	.handler(async ({ data: { metadataId } }) => {
		// Capture the seriesId before the cascade delete removes the media_items row
		const [item] = await db
			.select({ seriesId: mediaItems.seriesId })
			.from(mediaItems)
			.where(eq(mediaItems.mediaItemMetadataId, metadataId));

		await db
			.delete(mediaItemMetadata)
			.where(eq(mediaItemMetadata.id, metadataId));

		// If the item belonged to a series, delete the series if it's now empty
		if (item?.seriesId) {
			const [remaining] = await db
				.select({ itemCount: count() })
				.from(mediaItems)
				.where(eq(mediaItems.seriesId, item.seriesId));

			if (remaining?.itemCount === 0) {
				await db.delete(series).where(eq(series.id, item.seriesId));
			}
		}
	});
