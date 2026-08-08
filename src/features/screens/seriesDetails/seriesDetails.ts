import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/database/index";
import {
	creators,
	mediaItemInstances,
	mediaItemStatusEnum,
	mediaItems,
	mediaTypeEnum,
	nextItemStatusEnum,
	series,
} from "#/database/schema";
import { getLoggedInUser } from "#/features/screens/auth/session";
import { getMissingSeriesItems as getMissingSeriesItemsForUser } from "#/features/screens/seriesDetails/missingSeriesItems.server";
import { updateSeriesMetadata as updateSeriesMetadataForUser } from "#/features/screens/seriesDetails/seriesDetails.server";
import { MediaItemStatus, NextItemStatus } from "#/lib/enums";

export const getSeriesListByType = createServerFn({ method: "GET" })
	.inputValidator(z.object({ type: z.enum(mediaTypeEnum.enumValues) }))
	.handler(async ({ data: { type } }) => {
		const user = await getLoggedInUser();
		return db
			.select({ id: series.id, name: series.name })
			.from(series)
			.where(and(eq(series.type, type), eq(series.userId, user.id)))
			.orderBy(asc(series.sortName));
	});

export const getSeriesDetails = createServerFn({ method: "GET" })
	.inputValidator(z.object({ id: z.number() }))
	.handler(async ({ data: { id } }) => {
		const user = await getLoggedInUser();
		const [row] = await db
			.select()
			.from(series)
			.where(and(eq(series.id, id), eq(series.userId, user.id)));

		if (!row) throw new Error(`Series ${id} not found`);

		const items = await db
			.select({
				id: mediaItems.id,
				status: mediaItems.status,
				purchaseStatus: mediaItems.purchaseStatus,
				expectedReleaseDate: mediaItems.expectedReleaseDate,
				title: mediaItems.title,
				type: mediaItems.type,
				coverImageUrl: mediaItems.coverImageUrl,
				metadata: mediaItems.metadata,
				creatorId: mediaItems.creatorId,
				creatorName: creators.name,
			})
			.from(mediaItems)
			.leftJoin(creators, eq(mediaItems.creatorId, creators.id))
			.where(and(eq(mediaItems.seriesId, id), eq(mediaItems.userId, user.id)))
			.orderBy(
				sql`
					NULLIF(media_items.metadata->>'seriesBookNumber', '')::numeric
					NULLS LAST
			  	`,
				mediaItems.releaseDate,
			);

		if (items.length === 0) {
			return {
				...row,
				rating: parseFloat(row.rating ?? "") || 0,
				items: [],
			};
		}

		const itemIds = items.map((item) => item.id);
		const latestRatings = await db
			.selectDistinctOn([mediaItemInstances.mediaItemId], {
				mediaItemId: mediaItemInstances.mediaItemId,
				rating: mediaItemInstances.rating,
				completedAt: mediaItemInstances.completedAt,
			})
			.from(mediaItemInstances)
			.where(
				and(
					inArray(mediaItemInstances.mediaItemId, itemIds),
					isNotNull(mediaItemInstances.completedAt),
				),
			)
			.orderBy(mediaItemInstances.mediaItemId, desc(mediaItemInstances.id));

		const ratingMap = new Map(
			latestRatings.map((r) => [r.mediaItemId, r.rating]),
		);
		const completedAtMap = new Map(
			latestRatings.map((r) => [r.mediaItemId, r.completedAt]),
		);

		return {
			...row,
			rating: parseFloat(row.rating ?? "") || 0,
			items: items.map((item) => ({
				...item,
				rating: parseFloat(ratingMap.get(item.id) ?? "") || 0,
				completedAt: completedAtMap.get(item.id) ?? null,
			})),
		};
	});

export type SeriesDetails = Awaited<ReturnType<typeof getSeriesDetails>>;
export type SeriesItem = SeriesDetails["items"][number];

/**
 * Deliberately kept out of the route loader — it calls an external API, and the
 * section that consumes it is collapsed by default, so only an expand should
 * pay that cost.
 */
export const getMissingSeriesItems = createServerFn({ method: "GET" })
	.inputValidator(z.object({ seriesId: z.number() }))
	.handler(async ({ data: { seriesId } }) => {
		const user = await getLoggedInUser();
		return getMissingSeriesItemsForUser(seriesId, user.id);
	});

export type MissingSeriesItem = Awaited<
	ReturnType<typeof getMissingSeriesItems>
>[number];

export const updateSeriesStatus = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			seriesId: z.number(),
			status: z.enum(mediaItemStatusEnum.enumValues),
		}),
	)
	.handler(async ({ data: { seriesId, status } }) => {
		const user = await getLoggedInUser();

		const updates: Partial<typeof series.$inferInsert> = { status };

		if (status === MediaItemStatus.DROPPED) {
			updates.rating = null;
		}

		if (status === MediaItemStatus.WAITING_FOR_NEXT_RELEASE) {
			updates.nextItemStatus = NextItemStatus.WAITING_FOR_RELEASE;
		} else {
			const [current] = await db
				.select({ nextItemStatus: series.nextItemStatus })
				.from(series)
				.where(and(eq(series.id, seriesId), eq(series.userId, user.id)));
			if (current?.nextItemStatus === NextItemStatus.WAITING_FOR_RELEASE) {
				updates.nextItemStatus = null;
			}
		}

		await db
			.update(series)
			.set(updates)
			.where(and(eq(series.id, seriesId), eq(series.userId, user.id)));
	});

export const updateNextItemStatus = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			seriesId: z.number(),
			nextItemStatus: z.enum(nextItemStatusEnum.enumValues).nullable(),
		}),
	)
	.handler(async ({ data: { seriesId, nextItemStatus } }) => {
		const user = await getLoggedInUser();

		const updates: Partial<typeof series.$inferInsert> = { nextItemStatus };

		if (nextItemStatus === NextItemStatus.WAITING_FOR_RELEASE) {
			updates.status = MediaItemStatus.WAITING_FOR_NEXT_RELEASE;
		}

		await db
			.update(series)
			.set(updates)
			.where(and(eq(series.id, seriesId), eq(series.userId, user.id)));
	});

export const updateSeriesMetadata = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			seriesId: z.number(),
			name: z.string(),
			description: z.string().optional(),
			isComplete: z.boolean(),
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return updateSeriesMetadataForUser(data, user.id);
	});

export const deleteSeries = createServerFn({ method: "POST" })
	.inputValidator(z.object({ seriesId: z.number() }))
	.handler(async ({ data: { seriesId } }) => {
		const user = await getLoggedInUser();
		await db
			.delete(series)
			.where(and(eq(series.id, seriesId), eq(series.userId, user.id)));
	});
