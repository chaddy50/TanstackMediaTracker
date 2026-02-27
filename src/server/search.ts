import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import { mediaItemMetadata, mediaItems, mediaTypeEnum, series } from "#/db/schema";
import * as hardcover from "#/lib/api/hardcover";
import * as igdb from "#/lib/api/igdb";
import * as tmdb from "#/lib/api/tmdb";

import type { ExternalSearchResult } from "#/lib/api/types";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";

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
		// Call relevant external APIs in parallel
		const apiCalls: Promise<ExternalSearchResult[]>[] = [];

		if (type === MediaItemType.BOOK || type === "all") {
			apiCalls.push(hardcover.search(query));
		}
		if (type === MediaItemType.MOVIE || type === "all") {
			apiCalls.push(tmdb.search(query, type === "all" ? "all" : MediaItemType.MOVIE));
		} else if (type === MediaItemType.TV_SHOW) {
			apiCalls.push(tmdb.search(query, MediaItemType.TV_SHOW));
		}
		if (type === MediaItemType.VIDEO_GAME || type === "all") {
			apiCalls.push(igdb.search(query));
		}

		const resultArrays = await Promise.allSettled(apiCalls);
		const externalResults: ExternalSearchResult[] = resultArrays.flatMap((r) =>
			r.status === "fulfilled" ? r.value : [],
		);

		if (externalResults.length === 0) return [];

		// Check which results are already in the library
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
						.where(inArray(mediaItems.mediaItemMetadataId, metadataIds))
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
		// For TMDB movies, enrich metadata with collection/franchise info before saving.
		// belongs_to_collection is only on the movie details endpoint, not search.
		let metadata = data.metadata;
		if (data.externalSource === "tmdb" && data.type === "movie") {
			const collectionInfo = await tmdb.fetchMovieCollection(data.externalId);
			if (collectionInfo.series) {
				metadata = { ...metadata, ...collectionInfo };
			}
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

		// Find or create a series entity if this item belongs to one
		const seriesName = (metadata as Record<string, unknown>)?.series;
		let seriesId: number | null = null;
		if (typeof seriesName === "string" && seriesName) {
			const [existingSeries] = await db
				.select({ id: series.id })
				.from(series)
				.where(
					and(eq(series.name, seriesName), eq(series.type, data.type)),
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
						name: seriesName,
						type: data.type,
						description: seriesInfo?.description ?? null,
						isComplete: seriesInfo?.isComplete ?? false,
					})
					.returning({ id: series.id });
				if (newSeries) seriesId = newSeries.id;
			}
		}

		// Check if a mediaItems row already exists
		const [existingItem] = await db
			.select({ id: mediaItems.id, seriesId: mediaItems.seriesId })
			.from(mediaItems)
			.where(eq(mediaItems.mediaItemMetadataId, metadataId));

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
				mediaItemMetadataId: metadataId,
				status: MediaItemStatus.BACKLOG,
				seriesId,
			})
			.returning({ id: mediaItems.id });

		if (!newItem) throw new Error("Failed to create library entry");
		return { mediaItemId: newItem.id };
	});
