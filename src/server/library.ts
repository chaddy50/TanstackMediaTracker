import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, isNotNull } from "drizzle-orm";
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
import { getLoggedInUser } from "#/lib/session";

const libraryFiltersSchema = z.object({
	type: z.enum(mediaTypeEnum.enumValues).optional(),
	status: z.enum(mediaItemStatusEnum.enumValues).optional(),
});

export const getLibrary = createServerFn({ method: "GET" })
	.inputValidator(libraryFiltersSchema)
	.handler(async ({ data: { type, status } }) => {
		const user = await getLoggedInUser();

		// Subquery: most recent completed instance per media item
		const latestInstance = db
			.selectDistinctOn([mediaItemInstances.mediaItemId], {
				mediaItemId: mediaItemInstances.mediaItemId,
				rating: mediaItemInstances.rating,
				completedAt: mediaItemInstances.completedAt,
			})
			.from(mediaItemInstances)
			.where(isNotNull(mediaItemInstances.completedAt))
			.orderBy(mediaItemInstances.mediaItemId, desc(mediaItemInstances.id))
			.as("latest_instance");

		const items = await db
			.select({
				id: mediaItems.id,
				status: mediaItems.status,
				isPurchased: mediaItems.isPurchased,
				mediaItemId: mediaItemMetadata.id,
				title: mediaItemMetadata.title,
				type: mediaItemMetadata.type,
				coverImageUrl: mediaItemMetadata.coverImageUrl,
				seriesId: mediaItems.seriesId,
				seriesName: series.name,
				rating: latestInstance.rating,
				completedAt: latestInstance.completedAt,
			})
			.from(mediaItems)
			.innerJoin(
				mediaItemMetadata,
				eq(mediaItems.mediaItemMetadataId, mediaItemMetadata.id),
			)
			.leftJoin(series, eq(mediaItems.seriesId, series.id))
			.leftJoin(
				latestInstance,
				eq(latestInstance.mediaItemId, mediaItems.id),
			)
			.where(
				and(
					eq(mediaItems.userId, user.id),
					type ? eq(mediaItemMetadata.type, type) : undefined,
					status ? eq(mediaItems.status, status) : undefined,
				),
			)
			.orderBy(desc(mediaItems.updatedAt));

		return items.map((item) => ({
			...item,
			rating: parseFloat(item.rating ?? "") || 0,
			completedAt: item.completedAt ?? null,
		}));
	});

export type LibraryItem = Awaited<ReturnType<typeof getLibrary>>[number];
