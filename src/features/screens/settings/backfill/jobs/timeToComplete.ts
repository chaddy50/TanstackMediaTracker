import { and, eq, sql } from "drizzle-orm";

import { db } from "#/database/index";
import { mediaItems } from "#/database/schema";
import { MediaItemType } from "#/lib/enums";

const TMDB_DELAY_MS = 100;
const IGDB_BATCH_SIZE = 50;
const IGDB_BATCH_DELAY_MS = 250;

export async function runTimeToCompleteBackfill(
	userId: string,
): Promise<{ processedCount: number }> {
	let processedCount = 0;

	// Phase 1 — Movies (TMDB runtime)
	const movieRows = await db
		.selectDistinct({
			externalId: mediaItems.externalId,
		})
		.from(mediaItems)
		.where(
			and(
				eq(mediaItems.userId, userId),
				eq(mediaItems.type, MediaItemType.MOVIE),
				eq(mediaItems.externalSource, "tmdb"),
				sql`(${mediaItems.metadata}->>'runtime') IS NULL`,
			),
		);

	if (movieRows.length > 0) {
		const { fetchMovieDetails } = await import(
			"#/features/mediaItemSearch/api/tmdb"
		);
		for (let index = 0; index < movieRows.length; index++) {
			const row = movieRows[index];
			if (!row) continue;
			const details = await fetchMovieDetails(row.externalId);
			if (typeof details.runtime === "number") {
				await db
					.update(mediaItems)
					.set({
						metadata: sql`
							coalesce(${mediaItems.metadata}, '{}') ||
							${JSON.stringify(details)}::jsonb
						`,
					})
					.where(
						and(
							eq(mediaItems.userId, userId),
							eq(mediaItems.externalId, row.externalId),
							eq(mediaItems.externalSource, "tmdb"),
						),
					);
				processedCount++;
			}
			if (index < movieRows.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, TMDB_DELAY_MS));
			}
		}
	}

	// Phase 2 — TV Shows (TMDB episode runtime + count)
	const tvRows = await db
		.selectDistinct({
			externalId: mediaItems.externalId,
		})
		.from(mediaItems)
		.where(
			and(
				eq(mediaItems.userId, userId),
				eq(mediaItems.type, MediaItemType.TV_SHOW),
				eq(mediaItems.externalSource, "tmdb"),
				sql`(${mediaItems.metadata}->>'episodeRuntime') IS NULL`,
			),
		);

	if (tvRows.length > 0) {
		const { fetchTvShowDetails } = await import(
			"#/features/mediaItemSearch/api/tmdb"
		);
		for (let index = 0; index < tvRows.length; index++) {
			const row = tvRows[index];
			if (!row) continue;
			const details = await fetchTvShowDetails(row.externalId);
			if (typeof details.episodeRuntime === "number") {
				await db
					.update(mediaItems)
					.set({
						metadata: sql`
							coalesce(${mediaItems.metadata}, '{}') ||
							${JSON.stringify(details)}::jsonb
						`,
					})
					.where(
						and(
							eq(mediaItems.userId, userId),
							eq(mediaItems.externalId, row.externalId),
							eq(mediaItems.externalSource, "tmdb"),
						),
					);
				processedCount++;
			}
			if (index < tvRows.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, TMDB_DELAY_MS));
			}
		}
	}

	// Phase 3 — Games (IGDB time to beat)
	const gameRows = await db
		.selectDistinct({
			externalId: mediaItems.externalId,
		})
		.from(mediaItems)
		.where(
			and(
				eq(mediaItems.userId, userId),
				eq(mediaItems.type, MediaItemType.VIDEO_GAME),
				eq(mediaItems.externalSource, "igdb"),
				sql`(${mediaItems.metadata}->>'timeToBeatFetchedAt') IS NULL`,
			),
		);

	if (gameRows.length > 0) {
		const clientId = process.env.IGDB_CLIENT_ID;
		if (!clientId) throw new Error("IGDB_CLIENT_ID is not set");

		const { getAccessToken, fetchTimesToBeat } = await import(
			"#/features/mediaItemSearch/api/igdb"
		);
		const accessToken = await getAccessToken();

		for (
			let batchStart = 0;
			batchStart < gameRows.length;
			batchStart += IGDB_BATCH_SIZE
		) {
			const batch = gameRows.slice(batchStart, batchStart + IGDB_BATCH_SIZE);
			const gameIds = batch.map((row) => parseInt(row.externalId, 10));

			const timesMap = await fetchTimesToBeat(gameIds, clientId, accessToken);

			for (const row of batch) {
				const times = timesMap.get(parseInt(row.externalId, 10));
				if (!times) {
					continue;
				}

				await db
					.update(mediaItems)
					.set({
						metadata: sql`
							coalesce(${mediaItems.metadata}, '{}') ||
							${JSON.stringify(times)}::jsonb
						`,
					})
					.where(
						and(
							eq(mediaItems.userId, userId),
							eq(mediaItems.externalId, row.externalId),
							eq(mediaItems.externalSource, "igdb"),
						),
					);

				processedCount++;
			}

			if (batchStart + IGDB_BATCH_SIZE < gameRows.length) {
				await new Promise((resolve) =>
					setTimeout(resolve, IGDB_BATCH_DELAY_MS),
				);
			}
		}
	}

	return { processedCount };
}
