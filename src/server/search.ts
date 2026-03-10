import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import {
	mediaItemMetadata,
	mediaItems,
	mediaTypeEnum,
	series,
} from "#/db/schema";
import * as hardcover from "#/lib/api/hardcover";
import * as igdb from "#/lib/api/igdb";
import * as itunes from "#/lib/api/itunes";
import * as tmdb from "#/lib/api/tmdb";
import type { ExternalSearchResult } from "#/lib/api/types";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";
import { getLoggedInUser } from "#/lib/session";

export const typeSchema = z.enum([...mediaTypeEnum.enumValues, "all"] as const);

export type SearchResultWithStatus = ExternalSearchResult & {
	mediaItemId?: number;
	status?: MediaItemStatus;
};

export const searchMedia = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			query: z.string().min(1),
			type: typeSchema.default("all"),
		}),
	)
	.handler(async ({ data: { query, type } }) => {
		const user = await getLoggedInUser();

		// Call relevant external APIs in parallel
		const apiCalls: Promise<ExternalSearchResult[]>[] = [];

		if (type === MediaItemType.BOOK || type === "all") {
			apiCalls.push(hardcover.search(query));
		}
		if (type === MediaItemType.MOVIE || type === "all") {
			apiCalls.push(
				tmdb.search(query, type === "all" ? "all" : MediaItemType.MOVIE),
			);
		} else if (type === MediaItemType.TV_SHOW) {
			apiCalls.push(tmdb.search(query, MediaItemType.TV_SHOW));
		}
		if (type === MediaItemType.VIDEO_GAME || type === "all") {
			apiCalls.push(igdb.search(query));
		}
		if (type === MediaItemType.PODCAST || type === "all") {
			apiCalls.push(itunes.searchPodcasts(query));
		}

		const resultArrays = await Promise.allSettled(apiCalls);
		const externalResults: ExternalSearchResult[] = resultArrays.flatMap((r) =>
			r.status === "fulfilled" ? r.value : [],
		);

		if (externalResults.length === 0) return [];

		// Check which results are already in this user's library
		const externalIds = externalResults.map((r) => r.externalId);
		const existingMetadata = await db
			.select({
				id: mediaItemMetadata.id,
				externalId: mediaItemMetadata.externalId,
				externalSource: mediaItemMetadata.externalSource,
			})
			.from(mediaItemMetadata)
			.where(inArray(mediaItemMetadata.externalId, externalIds));

		const metadataIds = existingMetadata.map((m) => m.id);
		const existingItems =
			metadataIds.length > 0
				? await db
						.select({
							id: mediaItems.id,
							mediaItemMetadataId: mediaItems.mediaItemMetadataId,
							status: mediaItems.status,
						})
						.from(mediaItems)
						.where(
							and(
								inArray(mediaItems.mediaItemMetadataId, metadataIds),
								eq(mediaItems.userId, user.id),
							),
						)
				: [];

		// Build lookup maps
		const metadataByExternalKey = new Map(
			existingMetadata.map((m) => [`${m.externalId}:${m.externalSource}`, m]),
		);
		const itemByMetadataId = new Map(
			existingItems.map((i) => [i.mediaItemMetadataId, i]),
		);

		return externalResults.map((result): SearchResultWithStatus => {
			const meta = metadataByExternalKey.get(
				`${result.externalId}:${result.externalSource}`,
			);
			if (!meta) return result;

			const item = itemByMetadataId.get(meta.id);
			if (!item) return result;

			return { ...result, mediaItemId: item.id, status: item.status };
		});
	});

export const createCustomItem = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			type: z.enum(mediaTypeEnum.enumValues),
			title: z.string().min(1),
			description: z.string().optional(),
			coverImageUrl: z.string().optional(),
			releaseDate: z.string().optional(),
			metadata: z.record(z.string(), z.any()),
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		const externalId = crypto.randomUUID();
		const externalSource = "custom";

		const [inserted] = await db
			.insert(mediaItemMetadata)
			.values({
				externalId,
				externalSource,
				type: data.type,
				title: data.title,
				description: data.description ?? null,
				coverImageUrl: data.coverImageUrl ?? null,
				releaseDate: data.releaseDate ?? null,
				metadata: data.metadata,
			})
			.returning({ id: mediaItemMetadata.id });

		if (!inserted) throw new Error("Failed to create metadata");

		const [newItem] = await db
			.insert(mediaItems)
			.values({
				userId: user.id,
				mediaItemMetadataId: inserted.id,
				status: MediaItemStatus.BACKLOG,
				seriesId: null,
			})
			.returning({ id: mediaItems.id });

		if (!newItem) throw new Error("Failed to create library entry");
		return { mediaItemId: newItem.id };
	});

export const fetchEpisodesForFeed = createServerFn({ method: "GET" })
	.inputValidator(z.object({ feedUrl: z.string().url() }))
	.handler(async ({ data: { feedUrl } }) => {
		return itunes.fetchPodcastEpisodes(feedUrl);
	});

export const addPodcastArc = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			podcastTitle: z.string().min(1),
			podcastCoverImageUrl: z.string().optional(),
			arcTitle: z.string().min(1),
			arcMetadata: z.object({
				creator: z.string().optional(),
				genres: z.array(z.string()).optional(),
				feedUrl: z.string().optional(),
				episodeNumbers: z.array(z.number()).optional(),
				episodeTitles: z.array(z.string()).optional(),
				episodeGuids: z.array(z.string()).optional(),
				totalDuration: z.number().optional(),
				firstPublishedAt: z.string().optional(),
				lastPublishedAt: z.string().optional(),
			}),
			status: z.enum(
				Object.values(MediaItemStatus).filter(
					(statusValue) => statusValue !== MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
				) as [string, ...string[]],
			),
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();

		// Find or create the podcast series for this user
		const [existingSeries] = await db
			.select({ id: series.id })
			.from(series)
			.where(
				and(
					eq(series.name, data.podcastTitle),
					eq(series.type, MediaItemType.PODCAST),
					eq(series.userId, user.id),
				),
			);

		let seriesId: number;
		if (existingSeries) {
			seriesId = existingSeries.id;
		} else {
			const [newSeries] = await db
				.insert(series)
				.values({
					userId: user.id,
					name: data.podcastTitle,
					type: MediaItemType.PODCAST,
					isComplete: false,
				})
				.returning({ id: series.id });
			if (!newSeries) throw new Error("Failed to create podcast series");
			seriesId = newSeries.id;
		}

		// Podcast arcs have no external ID — each is a custom entry
		const [insertedMetadata] = await db
			.insert(mediaItemMetadata)
			.values({
				externalId: crypto.randomUUID(),
				externalSource: "itunes",
				type: MediaItemType.PODCAST,
				title: data.arcTitle,
				description: null,
				coverImageUrl: data.podcastCoverImageUrl ?? null,
				releaseDate: data.arcMetadata.firstPublishedAt ?? null,
				metadata: data.arcMetadata,
			})
			.returning({ id: mediaItemMetadata.id });

		if (!insertedMetadata) throw new Error("Failed to create arc metadata");

		const [newItem] = await db
			.insert(mediaItems)
			.values({
				userId: user.id,
				mediaItemMetadataId: insertedMetadata.id,
				status: data.status as MediaItemStatus,
				seriesId,
			})
			.returning({ id: mediaItems.id });

		if (!newItem) throw new Error("Failed to create library entry");
		return { mediaItemId: newItem.id };
	});

const arcMetadataSchema = z.object({
	creator: z.string().optional(),
	genres: z.array(z.string()).optional(),
	feedUrl: z.string().optional(),
	episodeNumbers: z.array(z.number()).optional(),
	episodeTitles: z.array(z.string()).optional(),
	episodeGuids: z.array(z.string()).optional(),
	totalDuration: z.number().optional(),
	firstPublishedAt: z.string().optional(),
	lastPublishedAt: z.string().optional(),
});

export const updatePodcastArcEpisodes = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			metadataId: z.number(),
			arcTitle: z.string().min(1),
			arcMetadata: arcMetadataSchema,
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();

		// Verify the user owns an item with this metadataId before updating
		const [ownedItem] = await db
			.select({ id: mediaItems.id })
			.from(mediaItems)
			.where(
				and(
					eq(mediaItems.mediaItemMetadataId, data.metadataId),
					eq(mediaItems.userId, user.id),
				),
			);

		if (!ownedItem) throw new Error("Unauthorized");

		await db
			.update(mediaItemMetadata)
			.set({
				title: data.arcTitle,
				releaseDate: data.arcMetadata.firstPublishedAt ?? null,
				metadata: data.arcMetadata,
			})
			.where(eq(mediaItemMetadata.id, data.metadataId));
	});

export const addToLibrary = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			externalId: z.string(),
			externalSource: z.string(),
			type: z.enum(mediaTypeEnum.enumValues),
			title: z.string(),
			description: z.string().optional(),
			coverImageUrl: z.string().optional(),
			releaseDate: z.string().optional(),
			metadata: z.record(z.string(), z.any()),
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();

		// For TMDB movies and TV shows, enrich metadata with details not available in search results.
		let metadata = data.metadata;
		if (data.externalSource === "tmdb" && data.type === "movie") {
			const details = await tmdb.fetchMovieDetails(data.externalId);
			metadata = { ...metadata, ...details };
		}
		if (data.externalSource === "tmdb" && data.type === "tv_show") {
			const details = await tmdb.fetchTvShowDetails(data.externalId);
			metadata = { ...metadata, ...details };
		}

		// Upsert metadata (no-op on conflict, then fetch existing if needed)
		const inserted = await db
			.insert(mediaItemMetadata)
			.values({
				externalId: data.externalId,
				externalSource: data.externalSource,
				type: data.type,
				title: data.title,
				description: data.description ?? null,
				coverImageUrl: data.coverImageUrl ?? null,
				releaseDate: data.releaseDate ?? null,
				metadata,
			})
			.onConflictDoNothing()
			.returning({ id: mediaItemMetadata.id });

		let metadataId: number;
		if (inserted.length > 0 && inserted[0]) {
			metadataId = inserted[0].id;
		} else {
			// Already exists — fetch the existing row
			const [existing] = await db
				.select({ id: mediaItemMetadata.id })
				.from(mediaItemMetadata)
				.where(eq(mediaItemMetadata.externalId, data.externalId));
			if (!existing) throw new Error("Failed to find or create metadata");
			metadataId = existing.id;
		}

		// Find or create a series entity for this user if this item belongs to one
		const seriesName = (metadata as Record<string, unknown>)?.series;
		let seriesId: number | null = null;
		if (typeof seriesName === "string" && seriesName) {
			const [existingSeries] = await db
				.select({ id: series.id })
				.from(series)
				.where(
					and(
						eq(series.name, seriesName),
						eq(series.type, data.type),
						eq(series.userId, user.id),
					),
				);
			if (existingSeries) {
				seriesId = existingSeries.id;
			} else {
				const seriesInfo =
					data.externalSource === "hardcover"
						? await hardcover.fetchSeriesInfo(seriesName)
						: null;

				const [newSeries] = await db
					.insert(series)
					.values({
						userId: user.id,
						name: seriesName,
						type: data.type,
						description: seriesInfo?.description ?? null,
						isComplete: seriesInfo?.isComplete ?? false,
					})
					.returning({ id: series.id });
				if (newSeries) seriesId = newSeries.id;
			}
		}

		// Check if this user already has a mediaItems row for this metadata
		const [existingItem] = await db
			.select({ id: mediaItems.id, seriesId: mediaItems.seriesId })
			.from(mediaItems)
			.where(
				and(
					eq(mediaItems.mediaItemMetadataId, metadataId),
					eq(mediaItems.userId, user.id),
				),
			);

		if (existingItem) {
			// Backfill seriesId if the item was added before series support
			if (seriesId && !existingItem.seriesId) {
				await db
					.update(mediaItems)
					.set({ seriesId })
					.where(eq(mediaItems.id, existingItem.id));
			}
			return { mediaItemId: existingItem.id };
		}

		// Create the user's library entry
		const [newItem] = await db
			.insert(mediaItems)
			.values({
				userId: user.id,
				mediaItemMetadataId: metadataId,
				status: MediaItemStatus.BACKLOG,
				seriesId,
			})
			.returning({ id: mediaItems.id });

		if (!newItem) throw new Error("Failed to create library entry");
		return { mediaItemId: newItem.id };
	});
