import { sql } from "drizzle-orm";

import {
	type MediaItemType,
	type MediaItemStatus,
	type PurchaseStatus,
} from "#/lib/enums";
import {
	genres,
	mediaItemInstances,
	mediaItemMetadata,
	mediaItems,
	mediaItemTags,
	series,
	tags,
	views,
	creators,
} from "#/db/schema";
import { testDb } from "./db";

// ---------------------------------------------------------------------------
// Truncation
// ---------------------------------------------------------------------------

/**
 * Removes all rows from every app table and resets serial IDs.
 * Call this in beforeEach so each test starts with a clean slate.
 *
 * Note: `series`, `creators`, `genres`, `tags`, `media_metadata`,
 * `media_items`, `media_item_instances`, `media_item_tags`, and `views`
 * all use plain-text userId (no FK to `user`), so no auth rows are needed.
 */
export async function truncateAll() {
	await testDb.execute(sql`
		TRUNCATE
			media_item_instances,
			media_item_tags,
			media_items,
			media_metadata,
			series,
			creators,
			genres,
			tags,
			views
		RESTART IDENTITY CASCADE
	`);
}

// ---------------------------------------------------------------------------
// Row factories
// ---------------------------------------------------------------------------

type InsertMetadataOptions = {
	type: MediaItemType;
	title?: string;
	externalId?: string;
	externalSource?: string;
	releaseDate?: string;
	metadata?: Record<string, unknown>;
};

/** Inserts a `media_metadata` row and returns its id. */
export async function insertMetadata(options: InsertMetadataOptions): Promise<number> {
	const [row] = await testDb
		.insert(mediaItemMetadata)
		.values({
			type: options.type,
			title: options.title ?? "Test Title",
			externalId: options.externalId ?? crypto.randomUUID(),
			externalSource: options.externalSource ?? "test",
			releaseDate: options.releaseDate ?? null,
			metadata: options.metadata ?? {},
		})
		.returning({ id: mediaItemMetadata.id });

	if (!row) throw new Error("insertMetadata failed");
	return row.id;
}

type InsertMediaItemOptions = {
	userId: string;
	metadataId: number;
	status?: MediaItemStatus;
	purchaseStatus?: PurchaseStatus;
	seriesId?: number;
	creatorId?: number;
	genreId?: number;
};

/** Inserts a `media_items` row and returns its id. */
export async function insertMediaItem(options: InsertMediaItemOptions): Promise<number> {
	const [row] = await testDb
		.insert(mediaItems)
		.values({
			userId: options.userId,
			mediaItemMetadataId: options.metadataId,
			status: options.status ?? ("backlog" as MediaItemStatus),
			purchaseStatus: options.purchaseStatus ?? ("not_purchased" as PurchaseStatus),
			seriesId: options.seriesId ?? null,
			creatorId: options.creatorId ?? null,
			genreId: options.genreId ?? null,
		})
		.returning({ id: mediaItems.id });

	if (!row) throw new Error("insertMediaItem failed");
	return row.id;
}

type InsertInstanceOptions = {
	mediaItemId: number;
	completedAt?: string;
	startedAt?: string;
	rating?: string;
};

/** Inserts a `media_item_instances` row and returns its id. */
export async function insertInstance(options: InsertInstanceOptions): Promise<number> {
	const [row] = await testDb
		.insert(mediaItemInstances)
		.values({
			mediaItemId: options.mediaItemId,
			completedAt: options.completedAt ?? null,
			startedAt: options.startedAt ?? null,
			rating: options.rating ?? null,
		})
		.returning({ id: mediaItemInstances.id });

	if (!row) throw new Error("insertInstance failed");
	return row.id;
}

type InsertSeriesOptions = {
	userId: string;
	name?: string;
	type: MediaItemType;
	status?: MediaItemStatus;
};

/** Inserts a `series` row and returns its id. */
export async function insertSeries(options: InsertSeriesOptions): Promise<number> {
	const [row] = await testDb
		.insert(series)
		.values({
			userId: options.userId,
			name: options.name ?? "Test Series",
			type: options.type,
			status: options.status ?? ("backlog" as MediaItemStatus),
		})
		.returning({ id: series.id });

	if (!row) throw new Error("insertSeries failed");
	return row.id;
}

type InsertGenreOptions = {
	userId: string;
	name: string;
};

/** Inserts a `genres` row and returns its id. */
export async function insertGenre(options: InsertGenreOptions): Promise<number> {
	const [row] = await testDb
		.insert(genres)
		.values({ userId: options.userId, name: options.name })
		.returning({ id: genres.id });

	if (!row) throw new Error("insertGenre failed");
	return row.id;
}

type InsertTagOptions = {
	userId: string;
	name: string;
};

/** Inserts a `tags` row and returns its id. */
export async function insertTag(options: InsertTagOptions): Promise<number> {
	const [row] = await testDb
		.insert(tags)
		.values({ userId: options.userId, name: options.name })
		.returning({ id: tags.id });

	if (!row) throw new Error("insertTag failed");
	return row.id;
}

/** Links a media item to a tag. */
export async function linkTag(mediaItemId: number, tagId: number): Promise<void> {
	await testDb.insert(mediaItemTags).values({ mediaItemId, tagId });
}

type InsertCreatorOptions = {
	userId: string;
	name: string;
};

/** Inserts a `creators` row and returns its id. */
export async function insertCreator(options: InsertCreatorOptions): Promise<number> {
	const [row] = await testDb
		.insert(creators)
		.values({ userId: options.userId, name: options.name })
		.returning({ id: creators.id });

	if (!row) throw new Error("insertCreator failed");
	return row.id;
}
