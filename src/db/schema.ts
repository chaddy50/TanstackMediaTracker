import {
	date,
	decimal,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { MediaItemStatus, MediaItemType } from "#/lib/enums";

// --- Enums ---

export const mediaTypeEnum = pgEnum("media_type", [
	MediaItemType.BOOK,
	MediaItemType.MOVIE,
	MediaItemType.TV_SHOW,
	MediaItemType.VIDEO_GAME,
]);

export const mediaItemStatusEnum = pgEnum("media_item_status", [
	MediaItemStatus.BACKLOG,
	MediaItemStatus.IN_PROGRESS,
	MediaItemStatus.COMPLETED,
	MediaItemStatus.DROPPED,
	MediaItemStatus.ON_HOLD,
]);

// --- Metadata types (typed at the TS level; JSONB is schemaless in Postgres) ---

type BookMetadata = {
	author?: string;
	isbn?: string;
	pageCount?: number;
	genres?: string[];
	series?: string;
	seriesBookNumber?: string;
};

type MovieMetadata = {
	director?: string;
	runtime?: number; // minutes
	genres?: string[];
	series?: string;
};

type TvMetadata = {
	creator?: string;
	seasons?: number;
	genres?: string[];
};

type GameMetadata = {
	developer?: string;
	platforms?: string[];
	genres?: string[];
	series?: string;
};

type MediaMetadata = BookMetadata | MovieMetadata | TvMetadata | GameMetadata;

// --- Tables ---

/**
 * Stores media data fetched from external APIs (TMDB, IGDB, Open Library).
 * Acts as a local cache — once fetched, never fetched again.
 */
export const mediaItemMetadata = pgTable(
	"media_metadata",
	{
		id: serial("id").primaryKey(),
		type: mediaTypeEnum("type").notNull(),
		title: text("title").notNull(),
		description: text("description"),
		coverImageUrl: text("cover_image_url"),
		releaseDate: date("release_date"),
		externalId: text("external_id").notNull(),
		externalSource: text("external_source").notNull(), // e.g. "tmdb", "igdb", "openlibrary"
		metadata: jsonb("metadata").$type<MediaMetadata>(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		// Prevents caching the same external item twice
		uniqueIndex("media_item_metadata_external_unique").on(
			t.externalId,
			t.externalSource,
		),
	],
);

/**
 * One row per media item the user is tracking.
 * Represents the "shelf" — what status is this item at right now?
 * Re-reads/re-watches keep status as "in_progress"; the UI derives the
 * "re-doing" label by checking for prior completed instances.
 */
export const mediaItems = pgTable("media_items", {
	id: serial("id").primaryKey(),
	mediaItemMetadataId: integer("media_item_metadata_id")
		.notNull()
		.references(() => mediaItemMetadata.id, { onDelete: "cascade" }),
	status: mediaItemStatusEnum("status").notNull().default("backlog"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.notNull()
		.$onUpdateFn(() => new Date()),
});

/**
 * One row per individual read/watch/playthrough of a media item.
 * A user can have multiple instances for the same entry (re-reads, re-watches, etc.).
 * Rating and review live here, scoped to a specific instance.
 * Instance order (1st, 2nd, etc.) is derived from `id` / `createdAt` when querying.
 */
export const mediaItemInstances = pgTable("media_item_instances", {
	id: serial("id").primaryKey(),
	mediaItemId: integer("media_item_id")
		.notNull()
		.references(() => mediaItems.id, { onDelete: "cascade" }),
	rating: decimal("rating", { precision: 3, scale: 1 }),
	reviewText: text("review_text"),
	startedAt: date("started_at"),
	completedAt: date("completed_at"), // null = still in progress
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.notNull()
		.$onUpdateFn(() => new Date()),
});
