import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import {
	mediaItemInstances,
	mediaItemMetadata,
	mediaItemStatusEnum,
	mediaItems,
	mediaTypeEnum,
} from "#/db/schema";

const libraryFiltersSchema = z.object({
	type: z.enum(mediaTypeEnum.enumValues).optional(),
	status: z.enum(mediaItemStatusEnum.enumValues).optional(),
});

export const getLibrary = createServerFn({ method: "GET" })
	.inputValidator(libraryFiltersSchema)
	.handler(async ({ data: { type, status } }) => {
		const items = await db
			.select({
				id: mediaItems.id,
				status: mediaItems.status,
				mediaItemId: mediaItemMetadata.id,
				title: mediaItemMetadata.title,
				type: mediaItemMetadata.type,
				coverImageUrl: mediaItemMetadata.coverImageUrl,
			})
			.from(mediaItems)
			.innerJoin(
				mediaItemMetadata,
				eq(mediaItems.mediaItemMetadataId, mediaItemMetadata.id),
			)
			.where(
				and(
					type ? eq(mediaItemMetadata.type, type) : undefined,
					status ? eq(mediaItems.status, status) : undefined,
				),
			)
			.orderBy(desc(mediaItems.updatedAt));

		if (items.length === 0) return [];

		// Get the most recent completed instance per entry for the display rating
		const entryIds = items.map((item) => item.id);
		const latestRatings = await db
			.selectDistinctOn([mediaItemInstances.mediaItemId], {
				mediaItemId: mediaItemInstances.mediaItemId,
				rating: mediaItemInstances.rating,
			})
			.from(mediaItemInstances)
			.where(
				and(
					inArray(mediaItemInstances.mediaItemId, entryIds),
					isNotNull(mediaItemInstances.completedAt),
				),
			)
			.orderBy(mediaItemInstances.mediaItemId, desc(mediaItemInstances.id));

		const ratingMap = new Map(
			latestRatings.map((r) => [r.mediaItemId, r.rating]),
		);

		return items.map((item) => ({
			...item,
			rating: ratingMap.get(item.mediaItemId) ?? null,
		}));
	});

export type LibraryItem = Awaited<ReturnType<typeof getLibrary>>[number];
