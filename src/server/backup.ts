import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import {
	mediaItemInstances,
	mediaItemMetadata,
	mediaItems,
	series,
	views,
	type ViewSubject,
} from "#/db/schema";
import { getLoggedInUser } from "#/server/auth/session";

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const exportBackup = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await getLoggedInUser();

		const seriesRows = await db
			.select()
			.from(series)
			.where(eq(series.userId, user.id));

		const itemRows = await db
			.select()
			.from(mediaItems)
			.where(eq(mediaItems.userId, user.id));

		const metadataIds = [
			...new Set(itemRows.map((item) => item.mediaItemMetadataId)),
		];
		const metadataRows =
			metadataIds.length > 0
				? await db
						.select()
						.from(mediaItemMetadata)
						.where(inArray(mediaItemMetadata.id, metadataIds))
				: [];

		const itemIds = itemRows.map((item) => item.id);
		const instanceRows =
			itemIds.length > 0
				? await db
						.select()
						.from(mediaItemInstances)
						.where(inArray(mediaItemInstances.mediaItemId, itemIds))
				: [];

		const viewRows = await db
			.select()
			.from(views)
			.where(eq(views.userId, user.id));

		return {
			version: 1,
			exportedAt: new Date().toISOString(),
			series: seriesRows,
			mediaItemMetadata: metadataRows,
			mediaItems: itemRows,
			mediaItemInstances: instanceRows,
			views: viewRows,
		};
	},
);

export type BackupData = Awaited<ReturnType<typeof exportBackup>>;

// ---------------------------------------------------------------------------
// Zod schema for import validation
// ---------------------------------------------------------------------------

const seriesBackupSchema = z.object({
	id: z.number().int(),
	name: z.string(),
	type: z.string(),
	status: z.string(),
	rating: z.string().nullable(),
	description: z.string().nullable(),
	isComplete: z.boolean(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

const metadataBackupSchema = z.object({
	id: z.number().int(),
	type: z.string(),
	title: z.string(),
	description: z.string().nullable(),
	coverImageUrl: z.string().nullable(),
	releaseDate: z.string().nullable(),
	externalId: z.string(),
	externalSource: z.string(),
	metadata: z.unknown().optional(),
	createdAt: z.string(),
});

const mediaItemBackupSchema = z.object({
	id: z.number().int(),
	mediaItemMetadataId: z.number().int(),
	seriesId: z.number().int().nullable(),
	status: z.string(),
	purchaseStatus: z.enum(["not_purchased", "want_to_buy", "purchased"]),
	createdAt: z.string(),
	updatedAt: z.string(),
});

const instanceBackupSchema = z.object({
	id: z.number().int(),
	mediaItemId: z.number().int(),
	rating: z.string().nullable(),
	fictionRating: z.unknown().nullable(),
	reviewText: z.string().nullable(),
	startedAt: z.string().nullable(),
	completedAt: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

const viewBackupSchema = z.object({
	id: z.number().int(),
	name: z.string(),
	subject: z.string(),
	filters: z.unknown(),
	displayOrder: z.number().int(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

const backupSchema = z.object({
	version: z.number().int(),
	exportedAt: z.string(),
	series: z.array(seriesBackupSchema),
	mediaItemMetadata: z.array(metadataBackupSchema),
	mediaItems: z.array(mediaItemBackupSchema),
	mediaItemInstances: z.array(instanceBackupSchema),
	views: z.array(viewBackupSchema),
});

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export const importBackup = createServerFn({ method: "POST" })
	.inputValidator(z.object({ backup: backupSchema }))
	.handler(async ({ data: { backup } }) => {
		const user = await getLoggedInUser();

		await db.transaction(async (tx) => {
			// 1. Delete all existing user data
			await tx.delete(views).where(eq(views.userId, user.id));
			await tx.delete(mediaItems).where(eq(mediaItems.userId, user.id));
			await tx.delete(series).where(eq(series.userId, user.id));

			// 2. Restore series — build old-id → new-id map
			const seriesIdMap = new Map<number, number>();
			for (const seriesRow of backup.series) {
				const [inserted] = await tx
					.insert(series)
					.values({
						userId: user.id,
						name: seriesRow.name,
						type: seriesRow.type as typeof series.$inferInsert.type,
						status: seriesRow.status as typeof series.$inferInsert.status,
						rating: seriesRow.rating,
						description: seriesRow.description,
						isComplete: seriesRow.isComplete,
						createdAt: new Date(seriesRow.createdAt),
						updatedAt: new Date(seriesRow.updatedAt),
					})
					.returning({ id: series.id });
				seriesIdMap.set(seriesRow.id, inserted.id);
			}

			// 3. Restore/find mediaItemMetadata — reuse existing rows by externalId
			const metadataIdMap = new Map<number, number>();
			for (const metaRow of backup.mediaItemMetadata) {
				const [existing] = await tx
					.select({ id: mediaItemMetadata.id })
					.from(mediaItemMetadata)
					.where(
						and(
							eq(mediaItemMetadata.externalId, metaRow.externalId),
							eq(mediaItemMetadata.externalSource, metaRow.externalSource),
						),
					);

				if (existing) {
					metadataIdMap.set(metaRow.id, existing.id);
				} else {
					const [inserted] = await tx
						.insert(mediaItemMetadata)
						.values({
							type: metaRow.type as typeof mediaItemMetadata.$inferInsert.type,
							title: metaRow.title,
							description: metaRow.description,
							coverImageUrl: metaRow.coverImageUrl,
							releaseDate: metaRow.releaseDate,
							externalId: metaRow.externalId,
							externalSource: metaRow.externalSource,
							metadata:
								metaRow.metadata as typeof mediaItemMetadata.$inferInsert.metadata,
							createdAt: new Date(metaRow.createdAt),
						})
						.returning({ id: mediaItemMetadata.id });
					metadataIdMap.set(metaRow.id, inserted.id);
				}
			}

			// 4. Restore mediaItems — build old-id → new-id map
			const itemIdMap = new Map<number, number>();
			for (const itemRow of backup.mediaItems) {
				const newMetadataId = metadataIdMap.get(itemRow.mediaItemMetadataId);
				if (newMetadataId === undefined) {
					continue;
				}
				const [inserted] = await tx
					.insert(mediaItems)
					.values({
						userId: user.id,
						mediaItemMetadataId: newMetadataId,
						seriesId: itemRow.seriesId
							? (seriesIdMap.get(itemRow.seriesId) ?? null)
							: null,
						status: itemRow.status as typeof mediaItems.$inferInsert.status,
						purchaseStatus: itemRow.purchaseStatus,
						createdAt: new Date(itemRow.createdAt),
						updatedAt: new Date(itemRow.updatedAt),
					})
					.returning({ id: mediaItems.id });
				itemIdMap.set(itemRow.id, inserted.id);
			}

			// 5. Restore mediaItemInstances
			for (const instanceRow of backup.mediaItemInstances) {
				const newItemId = itemIdMap.get(instanceRow.mediaItemId);
				if (newItemId === undefined) {
					continue;
				}
				await tx.insert(mediaItemInstances).values({
					mediaItemId: newItemId,
					rating: instanceRow.rating,
					fictionRating:
						instanceRow.fictionRating as typeof mediaItemInstances.$inferInsert.fictionRating,
					reviewText: instanceRow.reviewText,
					startedAt: instanceRow.startedAt,
					completedAt: instanceRow.completedAt,
					createdAt: new Date(instanceRow.createdAt),
					updatedAt: new Date(instanceRow.updatedAt),
				});
			}

			// 6. Restore views
			for (const viewRow of backup.views) {
				await tx.insert(views).values({
					userId: user.id,
					name: viewRow.name,
					subject: viewRow.subject as ViewSubject,
					filters: viewRow.filters as typeof views.$inferInsert.filters,
					displayOrder: viewRow.displayOrder,
					createdAt: new Date(viewRow.createdAt),
					updatedAt: new Date(viewRow.updatedAt),
				});
			}
		});
	});
