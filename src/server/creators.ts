import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import {
	creators,
	mediaItemInstances,
	mediaItemMetadata,
	mediaItems,
} from "#/db/schema";
import { MediaItemType } from "#/lib/enums";
import { getLoggedInUser } from "#/lib/session";

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
				isPurchased: mediaItems.isPurchased,
				expectedReleaseDate: mediaItems.expectedReleaseDate,
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
			.where(
				and(eq(mediaItems.creatorId, id), eq(mediaItems.userId, user.id)),
			)
			.orderBy(asc(mediaItemMetadata.releaseDate), asc(mediaItemMetadata.sortTitle));

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
	.handler(async ({ data: { creatorId, name, biography } }) => {
		const user = await getLoggedInUser();

		const [current] = await db
			.select({ name: creators.name })
			.from(creators)
			.where(and(eq(creators.id, creatorId), eq(creators.userId, user.id)));

		if (!current) {
			throw new Error(`Creator ${creatorId} not found`);
		}

		await db
			.update(creators)
			.set({ name, biography: biography ?? null })
			.where(and(eq(creators.id, creatorId), eq(creators.userId, user.id)));

		// On name change, sync the JSONB metadata field for all linked items
		if (current.name !== name) {
			// Get all linked media items to know which JSONB key to update per type
			const linkedItems = await db
				.select({
					metadataId: mediaItems.mediaItemMetadataId,
					type: mediaItemMetadata.type,
				})
				.from(mediaItems)
				.innerJoin(
					mediaItemMetadata,
					eq(mediaItems.mediaItemMetadataId, mediaItemMetadata.id),
				)
				.where(
					and(eq(mediaItems.creatorId, creatorId), eq(mediaItems.userId, user.id)),
				);

			const bookMetadataIds = linkedItems
				.filter((item) => item.type === MediaItemType.BOOK)
				.map((item) => item.metadataId);
			const movieMetadataIds = linkedItems
				.filter((item) => item.type === MediaItemType.MOVIE)
				.map((item) => item.metadataId);
			const tvPodcastMetadataIds = linkedItems
				.filter(
					(item) =>
						item.type === MediaItemType.TV_SHOW ||
						item.type === MediaItemType.PODCAST,
				)
				.map((item) => item.metadataId);
			const gameMetadataIds = linkedItems
				.filter((item) => item.type === MediaItemType.VIDEO_GAME)
				.map((item) => item.metadataId);

			if (bookMetadataIds.length > 0) {
				await db
					.update(mediaItemMetadata)
					.set({
						metadata: sql`jsonb_set(${mediaItemMetadata.metadata}, '{author}', ${JSON.stringify(name)}::jsonb)`,
					})
					.where(inArray(mediaItemMetadata.id, bookMetadataIds));
			}
			if (movieMetadataIds.length > 0) {
				await db
					.update(mediaItemMetadata)
					.set({
						metadata: sql`jsonb_set(${mediaItemMetadata.metadata}, '{director}', ${JSON.stringify(name)}::jsonb)`,
					})
					.where(inArray(mediaItemMetadata.id, movieMetadataIds));
			}
			if (tvPodcastMetadataIds.length > 0) {
				await db
					.update(mediaItemMetadata)
					.set({
						metadata: sql`jsonb_set(${mediaItemMetadata.metadata}, '{creator}', ${JSON.stringify(name)}::jsonb)`,
					})
					.where(inArray(mediaItemMetadata.id, tvPodcastMetadataIds));
			}
			if (gameMetadataIds.length > 0) {
				await db
					.update(mediaItemMetadata)
					.set({
						metadata: sql`jsonb_set(${mediaItemMetadata.metadata}, '{developer}', ${JSON.stringify(name)}::jsonb)`,
					})
					.where(inArray(mediaItemMetadata.id, gameMetadataIds));
			}
		}
	});

export const deleteCreator = createServerFn({ method: "POST" })
	.inputValidator(z.object({ creatorId: z.number() }))
	.handler(async ({ data: { creatorId } }) => {
		const user = await getLoggedInUser();
		await db
			.delete(creators)
			.where(and(eq(creators.id, creatorId), eq(creators.userId, user.id)));
	});

