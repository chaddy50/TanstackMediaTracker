import { createServerFn } from "@tanstack/react-start";
import {
	and,
	asc,
	desc,
	eq,
	gte,
	inArray,
	isNotNull,
	sql,
} from "drizzle-orm";

import { db } from "#/db/index";
import {
	mediaItemInstances,
	mediaItemMetadata,
	mediaItems,
	series,
} from "#/db/schema";
import { MediaItemStatus } from "#/lib/enums";

async function fetchInProgressItems() {
	return db
		.select({
			id: mediaItems.id,
			status: mediaItems.status,
			isPurchased: mediaItems.isPurchased,
			title: mediaItemMetadata.title,
			type: mediaItemMetadata.type,
			coverImageUrl: mediaItemMetadata.coverImageUrl,
			seriesId: mediaItems.seriesId,
			seriesName: series.name,
		})
		.from(mediaItems)
		.innerJoin(
			mediaItemMetadata,
			eq(mediaItems.mediaItemMetadataId, mediaItemMetadata.id),
		)
		.leftJoin(series, eq(mediaItems.seriesId, series.id))
		.where(eq(mediaItems.status, MediaItemStatus.IN_PROGRESS))
		.orderBy(asc(mediaItemMetadata.title));
}

async function fetchRecentlyFinishedItems() {
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	const cutoffDate = thirtyDaysAgo.toISOString().slice(0, 10);

	const items = await db
		.selectDistinctOn([mediaItems.id], {
			id: mediaItems.id,
			status: mediaItems.status,
			isPurchased: mediaItems.isPurchased,
			title: mediaItemMetadata.title,
			type: mediaItemMetadata.type,
			coverImageUrl: mediaItemMetadata.coverImageUrl,
			seriesId: mediaItems.seriesId,
			seriesName: series.name,
			completedAt: mediaItemInstances.completedAt,
		})
		.from(mediaItemInstances)
		.innerJoin(mediaItems, eq(mediaItemInstances.mediaItemId, mediaItems.id))
		.innerJoin(
			mediaItemMetadata,
			eq(mediaItems.mediaItemMetadataId, mediaItemMetadata.id),
		)
		.leftJoin(series, eq(mediaItems.seriesId, series.id))
		.where(
			and(
				isNotNull(mediaItemInstances.completedAt),
				gte(mediaItemInstances.completedAt, cutoffDate),
			),
		)
		.orderBy(mediaItems.id, desc(mediaItemInstances.completedAt));

	// Re-sort by completedAt desc after distinct
	return items.sort((a, b) => {
		if (a.completedAt === null) {
			return 1;
		}
		if (b.completedAt === null) {
			return -1;
		}
		return b.completedAt.localeCompare(a.completedAt);
	});
}

async function fetchExplicitNextUpItems() {
	return db
		.select({
			id: mediaItems.id,
			status: mediaItems.status,
			isPurchased: mediaItems.isPurchased,
			title: mediaItemMetadata.title,
			type: mediaItemMetadata.type,
			coverImageUrl: mediaItemMetadata.coverImageUrl,
			seriesId: mediaItems.seriesId,
			seriesName: series.name,
		})
		.from(mediaItems)
		.innerJoin(
			mediaItemMetadata,
			eq(mediaItems.mediaItemMetadataId, mediaItemMetadata.id),
		)
		.leftJoin(series, eq(mediaItems.seriesId, series.id))
		.where(eq(mediaItems.status, MediaItemStatus.NEXT_UP))
		.orderBy(asc(mediaItemMetadata.title));
}

async function fetchNextInSeriesItems(
	inProgressItems: Awaited<ReturnType<typeof fetchInProgressItems>>,
	recentlyFinishedItems: Awaited<ReturnType<typeof fetchRecentlyFinishedItems>>,
) {
	const inProgressSeriesIds = inProgressItems
		.map((item) => item.seriesId)
		.filter((id): id is number => id !== null);

	const recentlyFinishedSeriesIds = recentlyFinishedItems
		.map((item) => item.seriesId)
		.filter((id): id is number => id !== null);

	const uniqueSeriesIds = [
		...new Set([...inProgressSeriesIds, ...recentlyFinishedSeriesIds]),
	];

	if (uniqueSeriesIds.length === 0) {
		return [];
	}

	const allSeriesItems = await db
		.select({
			id: mediaItems.id,
			status: mediaItems.status,
			isPurchased: mediaItems.isPurchased,
			title: mediaItemMetadata.title,
			type: mediaItemMetadata.type,
			coverImageUrl: mediaItemMetadata.coverImageUrl,
			seriesId: mediaItems.seriesId,
			seriesName: series.name,
		})
		.from(mediaItems)
		.innerJoin(
			mediaItemMetadata,
			eq(mediaItems.mediaItemMetadataId, mediaItemMetadata.id),
		)
		.innerJoin(series, eq(mediaItems.seriesId, series.id))
		.where(inArray(mediaItems.seriesId, uniqueSeriesIds))
		.orderBy(
			mediaItems.seriesId,
			sql`NULLIF(media_metadata.metadata->>'seriesBookNumber', '')::numeric NULLS LAST`,
			mediaItemMetadata.releaseDate,
		);

	// Group all series items by seriesId, preserving DB order
	const allItemsBySeriesId = new Map<number, typeof allSeriesItems>();
	for (const item of allSeriesItems) {
		if (item.seriesId === null) {
			continue;
		}
		if (!allItemsBySeriesId.has(item.seriesId)) {
			allItemsBySeriesId.set(item.seriesId, []);
		}
		const existing = allItemsBySeriesId.get(item.seriesId);
		if (existing) {
			existing.push(item);
		}
	}

	// Build the set of active item IDs (in progress or recently finished)
	const activeItemIds = new Set([
		...inProgressItems.map((item) => item.id),
		...recentlyFinishedItems.map((item) => item.id),
	]);

	// For each series, find the last active item by index, then the first backlog item after it
	const nextInSeriesItems: typeof allSeriesItems = [];
	for (const [, items] of allItemsBySeriesId.entries()) {
		let lastActiveIndex = -1;
		for (let index = 0; index < items.length; index++) {
			if (activeItemIds.has(items[index].id)) {
				lastActiveIndex = index;
			}
		}
		if (lastActiveIndex === -1) {
			continue;
		}

		const nextItem = items.slice(lastActiveIndex + 1).find((item) => {
			return item.status === MediaItemStatus.BACKLOG;
		});
		if (nextItem) {
			nextInSeriesItems.push(nextItem);
		}
	}

	return nextInSeriesItems;
}

async function attachRatings<T extends { id: number }>(
	items: T[],
): Promise<(T & { rating: number })[]> {
	if (items.length === 0) {
		return items.map((item) => ({ ...item, rating: 0 }));
	}

	const itemIds = items.map((item) => item.id);
	const latestRatings = await db
		.selectDistinctOn([mediaItemInstances.mediaItemId], {
			mediaItemId: mediaItemInstances.mediaItemId,
			rating: mediaItemInstances.rating,
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

	return items.map((item) => ({
		...item,
		rating: parseFloat(ratingMap.get(item.id) ?? "") || 0,
	}));
}

export const getDashboardData = createServerFn({ method: "GET" }).handler(
	async () => {
		const [inProgressItemsRaw, recentlyFinishedItemsRaw] = await Promise.all([
			fetchInProgressItems(),
			fetchRecentlyFinishedItems(),
		]);

		const [explicitNextUpItemsRaw, autoNextInSeriesItemsRaw] = await Promise.all([
			fetchExplicitNextUpItems(),
			fetchNextInSeriesItems(inProgressItemsRaw, recentlyFinishedItemsRaw),
		]);

		const explicitNextUpIds = new Set(explicitNextUpItemsRaw.map((item) => item.id));
		const dedupedAutoItems = autoNextInSeriesItemsRaw.filter(
			(item) => !explicitNextUpIds.has(item.id),
		);
		const nextInSeriesItemsRaw = [...explicitNextUpItemsRaw, ...dedupedAutoItems];

		const recentlyFinishedWithoutCompletedAt = recentlyFinishedItemsRaw.map(
			({ completedAt: _completedAt, ...rest }) => rest,
		);

		const [inProgressItems, nextInSeriesItems, recentlyFinishedItems] =
			await Promise.all([
				attachRatings(inProgressItemsRaw),
				attachRatings(nextInSeriesItemsRaw),
				attachRatings(recentlyFinishedWithoutCompletedAt),
			]);

		return { inProgressItems, nextInSeriesItems, recentlyFinishedItems };
	},
);

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
export type DashboardItem = DashboardData["inProgressItems"][number];
