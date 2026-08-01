import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/database/index";
import {
	mediaItemInstances,
	mediaItems,
	series,
	type ViewSubject,
	views,
} from "#/database/schema";

/**
 * Backup export/import.
 *
 * Version 2 is the current format: each media item carries its own descriptive
 * data inline. Version 1 predates the collapse of the shared `media_metadata`
 * table and carries a separate `mediaItemMetadata` array that items reference by
 * id — those files still exist on disk, so they remain importable and are
 * flattened to the v2 shape on read.
 *
 * This file uses the .server.ts convention — it must never be statically
 * imported by client-side code. Import it only from server function handler
 * bodies or other server-only modules.
 */

export const BACKUP_VERSION = 2;

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export async function exportBackup(userId: string) {
	const seriesRows = await db
		.select()
		.from(series)
		.where(eq(series.userId, userId));

	const itemRows = await db
		.select()
		.from(mediaItems)
		.where(eq(mediaItems.userId, userId));

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
		.where(eq(views.userId, userId));

	return {
		version: BACKUP_VERSION,
		exportedAt: new Date().toISOString(),
		series: seriesRows,
		mediaItems: itemRows,
		mediaItemInstances: instanceRows,
		views: viewRows,
	};
}

// ---------------------------------------------------------------------------
// Zod schemas for import validation
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

/** The descriptive half of an item, shared by both format versions. */
const itemMetadataSchema = z.object({
	type: z.string(),
	title: z.string(),
	description: z.string().nullable(),
	coverImageUrl: z.string().nullable(),
	releaseDate: z.string().nullable(),
	externalId: z.string(),
	externalSource: z.string(),
	metadata: z.unknown().optional(),
});

const itemTrackingSchema = z.object({
	id: z.number().int(),
	seriesId: z.number().int().nullable(),
	status: z.string(),
	purchaseStatus: z.enum(["not_purchased", "want_to_buy", "purchased"]),
	createdAt: z.string(),
	updatedAt: z.string(),
});

const backupSchemaV2 = z.object({
	version: z.literal(2),
	exportedAt: z.string(),
	series: z.array(seriesBackupSchema),
	mediaItems: z.array(itemTrackingSchema.merge(itemMetadataSchema)),
	mediaItemInstances: z.array(instanceBackupSchema),
	views: z.array(viewBackupSchema),
});

const backupSchemaV1 = z.object({
	version: z.literal(1),
	exportedAt: z.string(),
	series: z.array(seriesBackupSchema),
	mediaItemMetadata: z.array(
		itemMetadataSchema.extend({
			id: z.number().int(),
			createdAt: z.string(),
		}),
	),
	mediaItems: z.array(
		itemTrackingSchema.extend({ mediaItemMetadataId: z.number().int() }),
	),
	mediaItemInstances: z.array(instanceBackupSchema),
	views: z.array(viewBackupSchema),
});

export const backupSchema = z.discriminatedUnion("version", [
	backupSchemaV1,
	backupSchemaV2,
]);

/**
 * The shape of a backup file as it comes back off disk. Timestamps are strings
 * here, not Dates: a backup is JSON, so `exportBackup`'s Date columns have
 * already been serialized by the time anyone re-reads one.
 */
export type BackupData = z.infer<typeof backupSchema>;
type BackupV2 = z.infer<typeof backupSchemaV2>;

/**
 * Folds a v1 backup into the v2 shape by joining each item to the metadata row
 * it references. Items whose metadata row is missing are dropped, matching the
 * importer's long-standing behavior; metadata rows no item references are
 * unreachable and disappear with the join.
 */
function normalizeToV2(backup: BackupData): BackupV2 {
	if (backup.version === 2) return backup;

	const metadataById = new Map(
		backup.mediaItemMetadata.map((row) => [row.id, row]),
	);

	const mediaItemsWithMetadata = backup.mediaItems.flatMap((item) => {
		const metadataRow = metadataById.get(item.mediaItemMetadataId);
		if (!metadataRow) return [];

		const { mediaItemMetadataId: _ignored, ...tracking } = item;
		return [
			{
				...tracking,
				type: metadataRow.type,
				title: metadataRow.title,
				description: metadataRow.description,
				coverImageUrl: metadataRow.coverImageUrl,
				releaseDate: metadataRow.releaseDate,
				externalId: metadataRow.externalId,
				externalSource: metadataRow.externalSource,
				metadata: metadataRow.metadata,
			},
		];
	});

	return {
		version: 2,
		exportedAt: backup.exportedAt,
		series: backup.series,
		mediaItems: mediaItemsWithMetadata,
		mediaItemInstances: backup.mediaItemInstances,
		views: backup.views,
	};
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export async function importBackup(
	rawBackup: BackupData,
	userId: string,
): Promise<void> {
	const backup = normalizeToV2(rawBackup);

	await db.transaction(async (tx) => {
		// 1. Delete all existing user data. Items now carry their own metadata,
		// so this leaves nothing orphaned behind.
		await tx.delete(views).where(eq(views.userId, userId));
		await tx.delete(mediaItems).where(eq(mediaItems.userId, userId));
		await tx.delete(series).where(eq(series.userId, userId));

		// 2. Restore series — build old-id → new-id map
		const seriesIdMap = new Map<number, number>();
		for (const seriesRow of backup.series) {
			const [inserted] = await tx
				.insert(series)
				.values({
					userId,
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

		// 3. Restore mediaItems — build old-id → new-id map
		const itemIdMap = new Map<number, number>();
		for (const itemRow of backup.mediaItems) {
			const [inserted] = await tx
				.insert(mediaItems)
				.values({
					userId,
					type: itemRow.type as typeof mediaItems.$inferInsert.type,
					title: itemRow.title,
					description: itemRow.description,
					coverImageUrl: itemRow.coverImageUrl,
					releaseDate: itemRow.releaseDate,
					externalId: itemRow.externalId,
					externalSource: itemRow.externalSource,
					metadata: itemRow.metadata as typeof mediaItems.$inferInsert.metadata,
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

		// 4. Restore mediaItemInstances
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

		// 5. Restore views
		for (const viewRow of backup.views) {
			await tx.insert(views).values({
				userId,
				name: viewRow.name,
				subject: viewRow.subject as ViewSubject,
				filters: viewRow.filters as typeof views.$inferInsert.filters,
				displayOrder: viewRow.displayOrder,
				createdAt: new Date(viewRow.createdAt),
				updatedAt: new Date(viewRow.updatedAt),
			});
		}
	});
}
