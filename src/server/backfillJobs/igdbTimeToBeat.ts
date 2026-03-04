import { and, eq, sql } from "drizzle-orm";

import { db } from "#/db/index";
import { mediaItemMetadata, mediaItems } from "#/db/schema";
import { MediaItemType } from "#/lib/enums";

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 250;

export async function runIgdbTimeToBeatBackfill(
	userId: string,
): Promise<{ processedCount: number }> {
	const rows = await db
		.selectDistinct({
			metadataId: mediaItemMetadata.id,
			externalId: mediaItemMetadata.externalId,
		})
		.from(mediaItems)
		.innerJoin(
			mediaItemMetadata,
			eq(mediaItems.mediaItemMetadataId, mediaItemMetadata.id),
		)
		.where(
			and(
				eq(mediaItems.userId, userId),
				eq(mediaItemMetadata.type, MediaItemType.VIDEO_GAME),
				eq(mediaItemMetadata.externalSource, "igdb"),
				sql`(${mediaItemMetadata.metadata}->>'timeToBeatFetchedAt') IS NULL`,
			),
		);

	if (rows.length === 0) {
		return { processedCount: 0 };
	}

	const clientId = process.env.IGDB_CLIENT_ID;
	if (!clientId) throw new Error("IGDB_CLIENT_ID is not set");

	const { getAccessToken, fetchTimesToBeat } = await import("#/lib/api/igdb");
	const accessToken = await getAccessToken();

	let processedCount = 0;

	for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
		const batch = rows.slice(batchStart, batchStart + BATCH_SIZE);
		const gameIds = batch.map((row) => parseInt(row.externalId, 10));

		const timesMap = await fetchTimesToBeat(gameIds, clientId, accessToken);

		for (const row of batch) {
			const times = timesMap.get(parseInt(row.externalId, 10));
			if (!times) {
				// fetchTimesToBeat returns empty map on API failure — skip so
				// we can retry this batch on the next backfill run.
				continue;
			}

			await db
				.update(mediaItemMetadata)
				.set({
					metadata: sql`
						coalesce(${mediaItemMetadata.metadata}, '{}') ||
						${JSON.stringify(times)}::jsonb
					`,
				})
				.where(eq(mediaItemMetadata.id, row.metadataId));

			processedCount++;
		}

		if (batchStart + BATCH_SIZE < rows.length) {
			await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
		}
	}

	return { processedCount };
}
