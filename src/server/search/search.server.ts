import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import {
	mediaItemMetadata,
	mediaItems,
	mediaTypeEnum,
	series,
} from "#/db/schema";
import * as hardcover from "#/server/api/hardcover";
import * as igdb from "#/server/api/igdb";
import * as itunes from "#/server/api/itunes";
import * as tmdb from "#/server/api/tmdb";
import type { ExternalSearchResult } from "#/server/api/types";
import { findOrCreateCreator } from "#/server/creators/creators.server";
import { MediaItemStatus, MediaItemType } from "#/server/enums";
import { syncSeriesStatus } from "#/server/series/seriesList.server";

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

export type AddToLibraryInput = {
	externalId: string;
	externalSource: string;
	type: MediaItemType;
	title: string;
	description?: string;
	coverImageUrl?: string;
	releaseDate?: string;
	metadata: Record<string, unknown>;
};

export async function handleAddToLibrary(
	data: AddToLibraryInput,
	userId: string,
): Promise<{ mediaItemId: number }> {
	const metadata = await enrichTmdbMetadata(
		data.externalId,
		data.externalSource,
		data.type,
		data.metadata,
	);
	const metadataId = await upsertMediaMetadata(data, metadata);

	const seriesName =
		typeof metadata.series === "string" ? metadata.series : null;
	const seriesId = seriesName
		? await findOrCreateSeriesForItem(
				seriesName,
				data.type,
				data.externalSource,
				userId,
			)
		: null;

	const creatorName = resolveCreatorName(data.type, metadata);
	let creatorId: number | null = null;
	if (creatorName) {
		const biography = await resolveCreatorBiography(
			creatorName,
			data.externalSource,
			metadata,
		);
		creatorId = await findOrCreateCreator(creatorName, userId, biography);
	}

	const [existingItem] = await db
		.select({
			id: mediaItems.id,
			seriesId: mediaItems.seriesId,
			creatorId: mediaItems.creatorId,
		})
		.from(mediaItems)
		.where(
			and(
				eq(mediaItems.mediaItemMetadataId, metadataId),
				eq(mediaItems.userId, userId),
			),
		);

	if (existingItem) {
		await backfillMissingRelations(
			existingItem.id,
			existingItem.seriesId,
			existingItem.creatorId,
			seriesId,
			creatorId,
		);
		return { mediaItemId: existingItem.id };
	}

	const mediaItemId = await insertLibraryEntry(
		userId,
		metadataId,
		seriesId,
		creatorId,
	);
	if (seriesId) {
		await syncSeriesStatus(seriesId, userId);
	}
	return { mediaItemId };
}

export type PodcastArcMetadata = {
	creator?: string;
	genres?: string[];
	feedUrl?: string;
	episodeNumbers?: number[];
	episodeTitles?: string[];
	episodeGuids?: string[];
	totalDuration?: number;
	firstPublishedAt?: string;
	lastPublishedAt?: string;
};

export type AddPodcastArcInput = {
	podcastTitle: string;
	podcastCoverImageUrl?: string;
	arcTitle: string;
	arcMetadata: PodcastArcMetadata;
	status: MediaItemStatus;
};

export async function handleAddPodcastArc(
	data: AddPodcastArcInput,
	userId: string,
): Promise<{ mediaItemId: number }> {
	// Find or create the podcast series for this user
	const [existingSeries] = await db
		.select({ id: series.id })
		.from(series)
		.where(
			and(
				eq(series.name, data.podcastTitle),
				eq(series.type, MediaItemType.PODCAST),
				eq(series.userId, userId),
			),
		);

	let seriesId: number;
	if (existingSeries) {
		seriesId = existingSeries.id;
	} else {
		const [newSeries] = await db
			.insert(series)
			.values({
				userId,
				name: data.podcastTitle,
				type: MediaItemType.PODCAST,
				isComplete: false,
			})
			.returning({ id: series.id });
		if (!newSeries) throw new Error("Failed to create podcast series");
		seriesId = newSeries.id;
	}

	// Find or create a creator for this podcast arc
	let arcCreatorId: number | null = null;
	if (data.arcMetadata.creator) {
		let biography: string | null = null;
		if (data.arcMetadata.feedUrl) {
			const channelInfo = await itunes.fetchPodcastChannelInfo(
				data.arcMetadata.feedUrl,
			);
			biography = channelInfo?.description ?? null;
		}
		arcCreatorId = await findOrCreateCreator(
			data.arcMetadata.creator,
			userId,
			biography,
		);
	}

	// Compute a deterministic externalId so that re-adding the same arc is idempotent.
	// Primary key: sorted episode GUIDs (stable regardless of arc title).
	// Fallback: podcastTitle + arcTitle when GUIDs are not available.
	const externalId =
		data.arcMetadata.episodeGuids?.length
			? `itunes-arc-guids:${[...data.arcMetadata.episodeGuids].sort().join(",")}`
			: `itunes-arc:${data.podcastTitle}:${data.arcTitle}`;

	const inserted = await db
		.insert(mediaItemMetadata)
		.values({
			externalId,
			externalSource: "itunes",
			type: MediaItemType.PODCAST,
			title: data.arcTitle,
			description: null,
			coverImageUrl: data.podcastCoverImageUrl ?? null,
			releaseDate: data.arcMetadata.firstPublishedAt ?? null,
			metadata: data.arcMetadata,
		})
		.onConflictDoNothing()
		.returning({ id: mediaItemMetadata.id });

	let metadataId: number;
	if (inserted.length > 0 && inserted[0]) {
		metadataId = inserted[0].id;
	} else {
		const [existing] = await db
			.select({ id: mediaItemMetadata.id })
			.from(mediaItemMetadata)
			.where(eq(mediaItemMetadata.externalId, externalId));
		if (!existing) throw new Error("Failed to find or create arc metadata");
		metadataId = existing.id;
	}

	// Return early if the user already has this arc in their library
	const [existingItem] = await db
		.select({ id: mediaItems.id })
		.from(mediaItems)
		.where(
			and(
				eq(mediaItems.mediaItemMetadataId, metadataId),
				eq(mediaItems.userId, userId),
			),
		);

	if (existingItem) {
		return { mediaItemId: existingItem.id };
	}

	const mediaItemId = await insertLibraryEntry(
		userId,
		metadataId,
		seriesId,
		arcCreatorId,
		data.status,
	);
	await syncSeriesStatus(seriesId, userId);
	return { mediaItemId };
}

// ---- Private helpers

export async function enrichTmdbMetadata(
	externalId: string,
	externalSource: string,
	type: MediaItemType,
	metadata: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	if (externalSource === "tmdb" && type === MediaItemType.MOVIE) {
		const details = await tmdb.fetchMovieDetails(externalId);
		return { ...metadata, ...details };
	}
	if (externalSource === "tmdb" && type === MediaItemType.TV_SHOW) {
		const details = await tmdb.fetchTvShowDetails(externalId);
		return { ...metadata, ...details };
	}
	return metadata;
}

async function upsertMediaMetadata(
	data: AddToLibraryInput,
	metadata: Record<string, unknown>,
): Promise<number> {
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

	if (inserted.length > 0 && inserted[0]) {
		return inserted[0].id;
	}

	// Already exists — fetch the existing row
	const [existing] = await db
		.select({ id: mediaItemMetadata.id })
		.from(mediaItemMetadata)
		.where(eq(mediaItemMetadata.externalId, data.externalId));
	if (!existing) throw new Error("Failed to find or create metadata");
	return existing.id;
}

async function findOrCreateSeriesForItem(
	seriesName: string,
	type: MediaItemType,
	externalSource: string,
	userId: string,
): Promise<number> {
	const [existingSeries] = await db
		.select({ id: series.id })
		.from(series)
		.where(
			and(
				eq(series.name, seriesName),
				eq(series.type, type),
				eq(series.userId, userId),
			),
		);
	if (existingSeries) {
		return existingSeries.id;
	}

	const seriesInfo =
		externalSource === "hardcover"
			? await hardcover.fetchSeriesInfo(seriesName)
			: null;

	const [newSeries] = await db
		.insert(series)
		.values({
			userId,
			name: seriesName,
			type,
			description: seriesInfo?.description ?? null,
			isComplete: seriesInfo?.isComplete ?? false,
		})
		.returning({ id: series.id });
	if (!newSeries) throw new Error("Failed to create series");
	return newSeries.id;
}

export function resolveCreatorName(
	type: MediaItemType,
	metadata: Record<string, unknown>,
): string | null {
	if (type === MediaItemType.BOOK) {
		return typeof metadata.author === "string" ? metadata.author : null;
	}
	if (type === MediaItemType.MOVIE) {
		return typeof metadata.director === "string" ? metadata.director : null;
	}
	if (type === MediaItemType.TV_SHOW || type === MediaItemType.PODCAST) {
		return typeof metadata.creator === "string" ? metadata.creator : null;
	}
	if (type === MediaItemType.VIDEO_GAME) {
		return typeof metadata.developer === "string" ? metadata.developer : null;
	}
	return null;
}

export async function resolveCreatorBiography(
	creatorName: string,
	externalSource: string,
	metadata: Record<string, unknown>,
): Promise<string | null> {
	if (externalSource === "hardcover") {
		const bioResult = await hardcover.fetchCreatorBio(creatorName);
		return bioResult?.biography ?? null;
	}
	if (externalSource === "tmdb") {
		const bioResult = await tmdb.fetchCreatorBio(creatorName);
		return bioResult?.biography ?? null;
	}
	if (externalSource === "igdb") {
		const biography =
			typeof metadata.developerBio === "string"
				? metadata.developerBio
				: null;
		// Strip transient developerBio so it is not persisted in metadata
		delete metadata.developerBio;
		return biography;
	}
	if (externalSource === "itunes" && typeof metadata.feedUrl === "string") {
		const channelInfo = await itunes.fetchPodcastChannelInfo(metadata.feedUrl);
		return channelInfo?.description ?? null;
	}
	return null;
}

async function backfillMissingRelations(
	itemId: number,
	existingSeriesId: number | null,
	existingCreatorId: number | null,
	newSeriesId: number | null,
	newCreatorId: number | null,
): Promise<void> {
	const updates: Record<string, unknown> = {};
	if (newSeriesId && !existingSeriesId) {
		updates.seriesId = newSeriesId;
	}
	if (newCreatorId && !existingCreatorId) {
		updates.creatorId = newCreatorId;
	}
	if (Object.keys(updates).length > 0) {
		await db.update(mediaItems).set(updates).where(eq(mediaItems.id, itemId));
	}
}

async function insertLibraryEntry(
	userId: string,
	metadataId: number,
	seriesId: number | null,
	creatorId: number | null,
	status: MediaItemStatus = MediaItemStatus.BACKLOG,
): Promise<number> {
	const [newItem] = await db
		.insert(mediaItems)
		.values({
			userId,
			mediaItemMetadataId: metadataId,
			status,
			seriesId,
			creatorId,
		})
		.returning({ id: mediaItems.id });
	if (!newItem) throw new Error("Failed to create library entry");
	return newItem.id;
}
