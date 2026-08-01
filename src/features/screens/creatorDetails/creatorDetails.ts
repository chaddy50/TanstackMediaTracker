import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/database/index";
import { creators, mediaItemInstances, mediaItems } from "#/database/schema";
import { getLoggedInUser } from "#/features/screens/auth/session";
import { updateCreatorMetadata as updateCreatorMetadataForUser } from "#/features/screens/creatorDetails/creatorDetails.server";

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const getCreatorListForUser = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await getLoggedInUser();
		return db
			.select({ id: creators.id, name: creators.name })
			.from(creators)
			.where(eq(creators.userId, user.id))
			.orderBy(asc(creators.sortName));
	},
);

export const getCreatorDetails = createServerFn({ method: "GET" })
	.inputValidator(z.object({ id: z.number() }))
	.handler(async ({ data: { id } }) => {
		const user = await getLoggedInUser();

		const [row] = await db
			.select()
			.from(creators)
			.where(and(eq(creators.id, id), eq(creators.userId, user.id)));

		if (!row) {
			throw new Error(`Creator ${id} not found`);
		}

		const items = await db
			.select({
				id: mediaItems.id,
				status: mediaItems.status,
				purchaseStatus: mediaItems.purchaseStatus,
				expectedReleaseDate: mediaItems.expectedReleaseDate,
				title: mediaItems.title,
				type: mediaItems.type,
				coverImageUrl: mediaItems.coverImageUrl,
				metadata: mediaItems.metadata,
			})
			.from(mediaItems)
			.where(and(eq(mediaItems.creatorId, id), eq(mediaItems.userId, user.id)))
			.orderBy(asc(mediaItems.releaseDate), asc(mediaItems.sortTitle));

		if (items.length === 0) {
			return { ...row, items: [] };
		}

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
		const completedAtMap = new Map(
			latestRatings.map((r) => [r.mediaItemId, r.completedAt]),
		);

		return {
			...row,
			items: items.map((item) => ({
				...item,
				rating: parseFloat(ratingMap.get(item.id) ?? "") || 0,
				completedAt: completedAtMap.get(item.id) ?? null,
			})),
		};
	});

export type CreatorDetails = Awaited<ReturnType<typeof getCreatorDetails>>;
export type CreatorItem = CreatorDetails["items"][number];

export const updateCreatorMetadata = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			creatorId: z.number(),
			name: z.string().min(1),
			biography: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return updateCreatorMetadataForUser(data, user.id);
	});

export const deleteCreator = createServerFn({ method: "POST" })
	.inputValidator(z.object({ creatorId: z.number() }))
	.handler(async ({ data: { creatorId } }) => {
		const user = await getLoggedInUser();
		await db
			.delete(creators)
			.where(and(eq(creators.id, creatorId), eq(creators.userId, user.id)));
	});
