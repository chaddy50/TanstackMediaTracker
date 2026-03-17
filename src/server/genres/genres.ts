import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import {
	genres,
	mediaItemInstances,
	mediaItemMetadata,
	mediaItems,
} from "#/db/schema";
import { getLoggedInUser } from "#/lib/session";
import { findOrCreateGenre } from "#/server/genres/genres.server";

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const getGenres = createServerFn({ method: "GET" }).handler(async () => {
	const user = await getLoggedInUser();
	return db
		.select({ id: genres.id, name: genres.name })
		.from(genres)
		.where(eq(genres.userId, user.id))
		.orderBy(asc(genres.name));
});

export const saveMediaItemGenre = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			mediaItemId: z.number().int(),
			genreName: z.string().min(1).nullable(),
		}),
	)
	.handler(async ({ data: { mediaItemId, genreName } }) => {
		const user = await getLoggedInUser();

		let genreId: number | null = null;
		if (genreName !== null) {
			genreId = await findOrCreateGenre(user.id, genreName);
		}

		await db
			.update(mediaItems)
			.set({ genreId })
			.where(and(eq(mediaItems.id, mediaItemId), eq(mediaItems.userId, user.id)));
	});

export const getGenreDetails = createServerFn({ method: "GET" })
	.inputValidator(z.object({ id: z.number() }))
	.handler(async ({ data: { id } }) => {
		const user = await getLoggedInUser();

		const [row] = await db
			.select()
			.from(genres)
			.where(and(eq(genres.id, id), eq(genres.userId, user.id)));

		if (!row) {
			throw new Error(`Genre ${id} not found`);
		}

		const items = await db
			.select({
				id: mediaItems.id,
				status: mediaItems.status,
				purchaseStatus: mediaItems.purchaseStatus,
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
				and(eq(mediaItems.genreId, id), eq(mediaItems.userId, user.id)),
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

export type GenreDetails = Awaited<ReturnType<typeof getGenreDetails>>;
export type GenreItem = GenreDetails["items"][number];
