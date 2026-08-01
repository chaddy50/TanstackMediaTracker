import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";

import { db } from "#/database/index";
import { genres, mediaItemInstances, mediaItems } from "#/database/schema";

/**
 * Find an existing genre row for (userId, name), or create one.
 * Returns the genreId.
 *
 * This file uses the .server.ts convention — it must never be statically
 * imported by client-side code. Import it only from server function handler
 * bodies or other server-only modules.
 */
export async function findOrCreateGenre(
	userId: string,
	name: string,
): Promise<number> {
	await db.insert(genres).values({ userId, name }).onConflictDoNothing();

	const [row] = await db
		.select({ id: genres.id })
		.from(genres)
		.where(and(eq(genres.userId, userId), eq(genres.name, name)));

	if (!row) {
		throw new Error(`Failed to find or create genre "${name}"`);
	}

	return row.id;
}

export async function fetchGenreDetails(genreId: number, userId: string) {
	const [row] = await db
		.select()
		.from(genres)
		.where(and(eq(genres.id, genreId), eq(genres.userId, userId)));

	if (!row) {
		throw new Error(`Genre ${genreId} not found`);
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
		.where(and(eq(mediaItems.genreId, genreId), eq(mediaItems.userId, userId)))
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
}
