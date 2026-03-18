import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import { mediaItemMetadata, mediaItems, mediaTypeEnum } from "#/db/schema";
import * as hardcover from "#/server/api/hardcover";
import * as igdb from "#/server/api/igdb";
import * as itunes from "#/server/api/itunes";
import * as tmdb from "#/server/api/tmdb";
import type { ExternalSearchResult } from "#/server/api/types";
import { type MediaItemStatus, MediaItemType } from "#/server/enums";

export const typeSchema = z.enum([...mediaTypeEnum.enumValues, "all"] as const);

export type SearchResultWithStatus = ExternalSearchResult & {
	mediaItemId?: number;
	status?: MediaItemStatus;
};

/**
 * Flattens settled API call results, silently dropping any that rejected.
 * This ensures a single failing external API does not suppress results from
 * the others.
 */
export function collectApiResults(
	settled: PromiseSettledResult<ExternalSearchResult[]>[],
): ExternalSearchResult[] {
	return settled.flatMap((result) =>
		result.status === "fulfilled" ? result.value : [],
	);
}

/**
 * Enriches external search results with the user's library status. Results
 * that exist in the user's library receive `mediaItemId` and `status`;
 * unrecognized results are returned unchanged.
 */
export function attachLibraryStatus(
	results: ExternalSearchResult[],
	existingMetadata: Array<{
		id: number;
		externalId: string;
		externalSource: string;
	}>,
	existingItems: Array<{
		id: number;
		mediaItemMetadataId: number;
		status: MediaItemStatus;
	}>,
): SearchResultWithStatus[] {
	const metadataByExternalKey = new Map(
		existingMetadata.map((m) => [`${m.externalId}:${m.externalSource}`, m]),
	);
	const itemByMetadataId = new Map(
		existingItems.map((item) => [item.mediaItemMetadataId, item]),
	);

	return results.map((result): SearchResultWithStatus => {
		const meta = metadataByExternalKey.get(
			`${result.externalId}:${result.externalSource}`,
		);
		if (!meta) return result;

		const item = itemByMetadataId.get(meta.id);
		if (!item) return result;

		return { ...result, mediaItemId: item.id, status: item.status };
	});
}

export async function performMediaSearch(
	userId: string,
	query: string,
	type: "all" | MediaItemType,
): Promise<SearchResultWithStatus[]> {
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
	const externalResults = collectApiResults(resultArrays);

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
							eq(mediaItems.userId, userId),
						),
					)
			: [];

	return attachLibraryStatus(externalResults, existingMetadata, existingItems);
}
