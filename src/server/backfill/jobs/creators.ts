import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "#/db/index";
import { mediaItemMetadata, mediaItems } from "#/db/schema";
import * as hardcover from "#/server/api/hardcover";
import * as igdb from "#/server/api/igdb";
import * as itunes from "#/server/api/itunes";
import * as tmdb from "#/server/api/tmdb";
import { MediaItemType } from "#/server/enums";
import { findOrCreateCreator } from "#/server/creators/creators.server";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type UnlinkedItem = {
	id: number;
	name: string;
	type: MediaItemType;
	feedUrl: string | null;
};

// Process at most this many unique creator names per run to stay within
// API rate limits and HTTP request timeouts.
const BACKFILL_BATCH_SIZE = 20;

export async function runCreatorsBackfillJob(
	userId: string,
): Promise<{ processedCount: number; remaining: number }> {
	// Fetch all items that don't yet have a creatorId
	const unlinkedItems = await db
		.select({
			id: mediaItems.id,
			metadataId: mediaItemMetadata.id,
			externalId: mediaItemMetadata.externalId,
			externalSource: mediaItemMetadata.externalSource,
			type: mediaItemMetadata.type,
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
				isNull(mediaItems.creatorId),
			),
		);

	// Extract creator name (and feedUrl for podcasts) per type from JSONB.
	// For movies and games, the name may be missing from stored metadata if the
	// item was added before those fields were populated — collect those separately
	// for API re-fetch below.
	const itemsWithName: UnlinkedItem[] = [];
	const moviesNeedingDirector: { id: number; metadataId: number; externalId: string }[] = [];
	const gamesNeedingDeveloper: { id: number; metadataId: number; externalId: string }[] = [];

	for (const item of unlinkedItems) {
		const meta = (item.metadata ?? {}) as Record<string, unknown>;
		let name: string | null = null;
		let feedUrl: string | null = null;

		switch (item.type) {
			case MediaItemType.BOOK:
				name = typeof meta.author === "string" ? meta.author : null;
				break;
			case MediaItemType.MOVIE:
				name = typeof meta.director === "string" ? meta.director : null;
				if (!name && item.externalSource === "tmdb" && item.externalId) {
					moviesNeedingDirector.push({
						id: item.id,
						metadataId: item.metadataId,
						externalId: item.externalId,
					});
				}
				break;
			case MediaItemType.TV_SHOW:
				name = typeof meta.creator === "string" ? meta.creator : null;
				break;
			case MediaItemType.PODCAST:
				name = typeof meta.creator === "string" ? meta.creator : null;
				feedUrl = typeof meta.feedUrl === "string" ? meta.feedUrl : null;
				break;
			case MediaItemType.VIDEO_GAME:
				name = typeof meta.developer === "string" ? meta.developer : null;
				if (!name && item.externalSource === "igdb" && item.externalId) {
					gamesNeedingDeveloper.push({
						id: item.id,
						metadataId: item.metadataId,
						externalId: item.externalId,
					});
				}
				break;
		}

		if (name) {
			itemsWithName.push({ id: item.id, name, type: item.type, feedUrl });
		}
	}

	// Re-fetch director from TMDB for movies that don't have it stored.
	// Also patch the shared metadata row so future runs skip this step.
	for (const movie of moviesNeedingDirector) {
		const details = await tmdb.fetchMovieDetails(movie.externalId);
		if (details.director) {
			await db
				.update(mediaItemMetadata)
				.set({
					metadata: sql`${mediaItemMetadata.metadata} || jsonb_build_object('director', ${details.director}::text)`,
				})
				.where(eq(mediaItemMetadata.id, movie.metadataId));
			itemsWithName.push({
				id: movie.id,
				name: details.director,
				type: MediaItemType.MOVIE,
				feedUrl: null,
			});
		}
		await sleep(250);
	}

	// Re-fetch developer from IGDB for games that don't have it stored.
	// Also patch the shared metadata row so future runs skip this step.
	for (const game of gamesNeedingDeveloper) {
		const result = await igdb.fetchGameDeveloper(game.externalId);
		if (result) {
			await db
				.update(mediaItemMetadata)
				.set({
					metadata: sql`${mediaItemMetadata.metadata} || jsonb_build_object('developer', ${result.developer}::text)`,
				})
				.where(eq(mediaItemMetadata.id, game.metadataId));
			itemsWithName.push({
				id: game.id,
				name: result.developer,
				type: MediaItemType.VIDEO_GAME,
				feedUrl: null,
			});
		}
		await sleep(500);
	}

	if (itemsWithName.length === 0) {
		return { processedCount: 0, remaining: 0 };
	}

	// Collect all types and podcast feedUrls per unique creator name
	const allNameToTypes = new Map<string, Set<MediaItemType>>();
	const allNameToFeedUrls = new Map<string, string[]>();
	for (const item of itemsWithName) {
		const types = allNameToTypes.get(item.name) ?? new Set();
		types.add(item.type);
		allNameToTypes.set(item.name, types);

		if (item.feedUrl) {
			const feedUrls = allNameToFeedUrls.get(item.name) ?? [];
			feedUrls.push(item.feedUrl);
			allNameToFeedUrls.set(item.name, feedUrls);
		}
	}

	// Only process the first BACKFILL_BATCH_SIZE unique creator names per run
	const allNames = [...allNameToTypes.keys()];
	const batchNames = new Set(allNames.slice(0, BACKFILL_BATCH_SIZE));
	const remainingCount = Math.max(0, allNames.length - BACKFILL_BATCH_SIZE);

	// Resolve biography per unique name, trying type-appropriate APIs in order.
	// Delays after each external call stay within known rate limits:
	//   Hardcover GraphQL — 1 500 ms between calls (observed rate limit at 500 ms)
	//   TMDB — 40 req/10 s; 250 ms keeps well under that
	//   iTunes RSS — direct HTTP to podcast hosts; 200 ms is a courtesy delay
	const nameToCreatorId = new Map<string, number>();
	for (const name of batchNames) {
		const types = allNameToTypes.get(name);
		if (!types) {
			continue;
		}
		let biography: string | null = null;

		if (types.has(MediaItemType.BOOK)) {
			const result = await hardcover.fetchCreatorBio(name);
			biography = result?.biography ?? null;
			await sleep(1500);
		}

		if (!biography && (types.has(MediaItemType.MOVIE) || types.has(MediaItemType.TV_SHOW))) {
			const result = await tmdb.fetchCreatorBio(name);
			biography = result?.biography ?? null;
			await sleep(250);
		}

		if (!biography && types.has(MediaItemType.PODCAST)) {
			const feedUrls = allNameToFeedUrls.get(name) ?? [];
			if (feedUrls.length > 0) {
				const result = await itunes.fetchPodcastChannelInfo(feedUrls[0]);
				biography = result?.description ?? null;
				await sleep(200);
			}
		}

		const creatorId = await findOrCreateCreator(name, userId, biography);
		nameToCreatorId.set(name, creatorId);
	}

	// Batch-update mediaItems.creatorId for items whose creator name is in this batch
	const creatorIdToItemIds = new Map<number, number[]>();
	for (const { id, name } of itemsWithName) {
		const creatorId = nameToCreatorId.get(name);
		if (creatorId === undefined) {
			continue;
		}
		const existing = creatorIdToItemIds.get(creatorId) ?? [];
		existing.push(id);
		creatorIdToItemIds.set(creatorId, existing);
	}

	let count = 0;
	for (const [creatorId, itemIds] of creatorIdToItemIds) {
		await db
			.update(mediaItems)
			.set({ creatorId })
			.where(
				and(
					inArray(mediaItems.id, itemIds),
					eq(mediaItems.userId, userId),
				),
			);
		count += itemIds.length;
	}

	return { processedCount: count, remaining: remainingCount };
}
