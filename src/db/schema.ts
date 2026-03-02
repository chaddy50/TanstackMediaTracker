import {
	boolean,
	date,
	decimal,
	index,
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
	MediaItemStatus.NEXT_UP,
	MediaItemStatus.IN_PROGRESS,
	MediaItemStatus.ON_HOLD,
	MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
	MediaItemStatus.COMPLETED,
	MediaItemStatus.DROPPED,
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

export type ViewSubject = "items" | "series";

export type ItemSortField = "updatedAt" | "title" | "rating" | "completedAt";
export type SeriesSortField = "name" | "updatedAt" | "rating" | "itemCount";
export type SortDirection = "asc" | "desc";

export type ViewFilters = {
	mediaTypes?: MediaItemType[];
	statuses?: MediaItemStatus[];
	isPurchased?: boolean;
	completedThisYear?: boolean;
	completedYearStart?: number;
	completedYearEnd?: number;
	isSeriesComplete?: boolean;
	sortBy?: ItemSortField | SeriesSortField;
	sortDirection?: SortDirection;
};

export type FictionRatingField = { rating: number; comment?: string };

export type FictionRating = {
	setting: FictionRatingField;
	character: FictionRatingField;
	plot: FictionRatingField;
	enjoyment: FictionRatingField;
	emotionalImpact: FictionRatingField;
};

// --- Better-auth tables ---

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdateFn(() => new Date())
		.notNull(),
});

export const session = pgTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: timestamp("expires_at").notNull(),
		token: text("token").notNull().unique(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdateFn(() => new Date())
			.notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at"),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdateFn(() => new Date())
			.notNull(),
	},
	(table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdateFn(() => new Date())
			.notNull(),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);

// --- App tables ---

/**
 * A named series (e.g. "The Lord of the Rings", "Star Wars").
 * Holds the user's overall status and rating for the whole series.
 */
export const series = pgTable("series", {
	id: serial("id").primaryKey(),
	userId: text("user_id").notNull(),
	name: text("name").notNull(),
	type: mediaTypeEnum("type").notNull(),
	status: mediaItemStatusEnum("status").notNull().default("backlog"),
	rating: decimal("rating", { precision: 3, scale: 1 }),
	description: text("description"),
	isComplete: boolean("is_complete").notNull().default(false),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.notNull()
		.$onUpdateFn(() => new Date()),
});

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
	userId: text("user_id").notNull(),
	mediaItemMetadataId: integer("media_item_metadata_id")
		.notNull()
		.references(() => mediaItemMetadata.id, { onDelete: "cascade" }),
	seriesId: integer("series_id").references(() => series.id, {
		onDelete: "set null",
	}),
	status: mediaItemStatusEnum("status").notNull().default("backlog"),
	isPurchased: boolean("is_purchased").notNull().default(false),
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
	fictionRating: jsonb("fiction_rating").$type<FictionRating>(),
	reviewText: text("review_text"),
	startedAt: date("started_at"),
	completedAt: date("completed_at"), // null = still in progress
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.notNull()
		.$onUpdateFn(() => new Date()),
});

/**
 * User-defined views — named, saved filter configurations that can show
 * either media items or series.
 */
export const views = pgTable("views", {
	id: serial("id").primaryKey(),
	userId: text("user_id").notNull(),
	name: text("name").notNull(),
	subject: text("subject").notNull().$type<ViewSubject>(), // 'items' | 'series'
	filters: jsonb("filters").notNull().default({}).$type<ViewFilters>(),
	displayOrder: integer("display_order").notNull().default(0),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.notNull()
		.$onUpdateFn(() => new Date()),
});
