import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import {
	mediaItemInstances,
	mediaItemMetadata,
	mediaItemStatusEnum,
	mediaItems,
} from "#/db/schema";

export const getMediaItemDetails = createServerFn({ method: "GET" })
	.inputValidator(z.object({ id: z.number() }))
	.handler(async ({ data: { id } }) => {
		const [row] = await db
			.select({
				id: mediaItems.id,
				status: mediaItems.status,
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
			.where(eq(mediaItems.id, id));

		if (!row) throw new Error(`Entry ${id} not found`);

		const instances = await db
			.select({
				id: mediaItemInstances.id,
				rating: mediaItemInstances.rating,
				reviewText: mediaItemInstances.reviewText,
				startedAt: mediaItemInstances.startedAt,
				completedAt: mediaItemInstances.completedAt,
			})
			.from(mediaItemInstances)
			.where(eq(mediaItemInstances.mediaItemId, id))
			.orderBy(asc(mediaItemInstances.id));

		return { ...row, instances };
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
				reviewText,
				startedAt,
				completedAt,
			},
		}) => {
			const values = {
				rating: rating ?? null,
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
		},
	);

export const deleteInstance = createServerFn({ method: "POST" })
	.inputValidator(z.object({ instanceId: z.number() }))
	.handler(async ({ data: { instanceId } }) => {
		await db
			.delete(mediaItemInstances)
			.where(eq(mediaItemInstances.id, instanceId));
	});

export const removeFromLibrary = createServerFn({ method: "POST" })
	.inputValidator(z.object({ metadataId: z.number() }))
	.handler(async ({ data: { metadataId } }) => {
		await db
			.delete(mediaItemMetadata)
			.where(eq(mediaItemMetadata.id, metadataId));
	});
