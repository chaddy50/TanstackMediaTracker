import { createServerFn } from "@tanstack/react-start";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import {
	mediaItemMetadata,
	type mediaItemStatusEnum,
	mediaItems,
	mediaTypeEnum,
} from "#/db/schema";
import * as igdb from "#/lib/api/igdb";
import * as openLibrary from "#/lib/api/openLibrary";
import * as tmdb from "#/lib/api/tmdb";
import type { ExternalSearchResult } from "#/lib/api/types";

export const typeSchema = z.enum([...mediaTypeEnum.enumValues, "all"] as const);

export type SearchResultWithStatus = ExternalSearchResult & {
	mediaItemId?: number;
	status?: (typeof mediaItemStatusEnum.enumValues)[number];
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

		if (type === "book" || type === "all") {
			apiCalls.push(openLibrary.search(query));
		}
		if (type === "movie" || type === "all") {
			apiCalls.push(tmdb.search(query, type === "all" ? "all" : "movie"));
		} else if (type === "tv_show") {
			apiCalls.push(tmdb.search(query, "tv_show"));
		}
		if (type === "video_game" || type === "all") {
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
				metadata: data.metadata,
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

		// Check if a mediaItems row already exists
		const [existingItem] = await db
			.select({ id: mediaItems.id })
			.from(mediaItems)
			.where(eq(mediaItems.mediaItemMetadataId, metadataId));

		if (existingItem) {
			return { mediaItemId: existingItem.id };
		}

		// Create the user's library entry
		const [newItem] = await db
			.insert(mediaItems)
			.values({ mediaItemMetadataId: metadataId, status: "backlog" })
			.returning({ id: mediaItems.id });

		if (!newItem) throw new Error("Failed to create library entry");
		return { mediaItemId: newItem.id };
	});
