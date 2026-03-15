import { and, eq, isNotNull, isNull } from "drizzle-orm";

import { db } from "#/db/index";
import { mediaItemMetadata, mediaItems } from "#/db/schema";
import { findOrCreateGenre } from "#/server/genresInternal";

export async function runGenresBackfill(
	userId: string,
): Promise<{ processedCount: number }> {
	// Find items that have no genre assigned but do have genres in the JSONB metadata
	const rows = await db
		.select({
			id: mediaItems.id,
			metadata: mediaItemMetadata.metadata,
		})
		.from(mediaItems)
		.innerJoin(
			mediaItemMetadata,
			eq(mediaItems.mediaItemMetadataId, mediaItemMetadata.id),
		)
		.where(
			and(
				eq(mediaItems.userId, userId),
				isNull(mediaItems.genreId),
				isNotNull(mediaItemMetadata.metadata),
			),
		);

	let processedCount = 0;

	for (const row of rows) {
		const rawMetadata = row.metadata as Record<string, unknown> | null;
		if (!rawMetadata) {
			continue;
		}

		const genres = rawMetadata.genres;
		if (!Array.isArray(genres) || genres.length === 0) {
			continue;
		}

		const firstName = typeof genres[0] === "string" ? genres[0].trim() : null;
		if (!firstName) {
			continue;
		}

		const genreId = await findOrCreateGenre(userId, firstName);
		await db
			.update(mediaItems)
			.set({ genreId })
			.where(and(eq(mediaItems.id, row.id), eq(mediaItems.userId, userId)));

		processedCount++;
	}

	return { processedCount };
}
