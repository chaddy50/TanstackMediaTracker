import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import { mediaItemMetadata, mediaItems, mediaTypeEnum } from "#/db/schema";
import * as itunes from "#/server/api/itunes";
import { getLoggedInUser } from "#/server/auth/session";
import { MediaItemStatus } from "#/server/enums";
import {
	handleAddPodcastArc,
	handleAddToLibrary,
	performMediaSearch,
	typeSchema,
} from "@/server/search/search.server";

export const searchMedia = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			query: z.string().min(1),
			type: typeSchema.default("all"),
		}),
	)
	.handler(async ({ data: { query, type } }) => {
		const user = await getLoggedInUser();
		return performMediaSearch(user.id, query, type);
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
					(statusValue) =>
						statusValue !== MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
				) as [string, ...string[]],
			),
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return handleAddPodcastArc(
			{ ...data, status: data.status as MediaItemStatus },
			user.id,
		);
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
		return handleAddToLibrary(data, user.id);
	});
