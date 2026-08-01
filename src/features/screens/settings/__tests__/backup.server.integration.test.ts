import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#/database/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/features/screens/auth", () => ({ auth: {} }));
vi.mock("#/features/screens/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

import { eq } from "drizzle-orm";
import { mediaItems } from "#/database/schema";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";
import { testDb } from "#/tests/integration/db";
import {
	insertInstance,
	insertMediaItem,
	insertSeries,
	truncateAll,
} from "#/tests/integration/helpers";
import { backupSchema, exportBackup, importBackup } from "../backup.server";

/** Serializes an export the way writing it to disk and reading it back would. */
async function exportThroughJson(userId: string) {
	const exported = await exportBackup(userId);
	return backupSchema.parse(JSON.parse(JSON.stringify(exported)));
}

const USER_A = "user-a";
const USER_B = "user-b";

const TIMESTAMP = "2026-01-01T00:00:00.000Z";

beforeEach(() => truncateAll());

/** A version-1 file, matching the pre-collapse export shape exactly. */
function buildV1Backup() {
	return {
		version: 1,
		exportedAt: TIMESTAMP,
		series: [],
		mediaItemMetadata: [
			{
				id: 500,
				type: MediaItemType.MOVIE,
				title: "Dune",
				description: "Legacy description",
				coverImageUrl: "http://example.test/legacy.jpg",
				releaseDate: "2021-10-22",
				externalId: "tmdb-438631",
				externalSource: "tmdb",
				metadata: { director: "Denis Villeneuve" },
				createdAt: TIMESTAMP,
			},
			{
				id: 501,
				type: MediaItemType.BOOK,
				title: "Unreferenced",
				description: null,
				coverImageUrl: null,
				releaseDate: null,
				externalId: "hc-orphan",
				externalSource: "hardcover",
				metadata: {},
				createdAt: TIMESTAMP,
			},
		],
		mediaItems: [
			{
				id: 900,
				mediaItemMetadataId: 500,
				seriesId: null,
				status: MediaItemStatus.COMPLETED,
				purchaseStatus: "purchased" as const,
				createdAt: TIMESTAMP,
				updatedAt: TIMESTAMP,
			},
		],
		mediaItemInstances: [
			{
				id: 800,
				mediaItemId: 900,
				rating: "9.0",
				fictionRating: null,
				reviewText: "Legacy review",
				startedAt: "2021-11-01",
				completedAt: "2021-11-02",
				createdAt: TIMESTAMP,
				updatedAt: TIMESTAMP,
			},
		],
		views: [],
	};
}

describe("exportBackup", () => {
	it("emits version 2 with metadata inlined and no separate array", async () => {
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			title: "Dune",
		});

		const backup = await exportBackup(USER_A);

		expect(backup.version).toBe(2);
		expect(backup).not.toHaveProperty("mediaItemMetadata");
		expect(backup.mediaItems[0]).toMatchObject({
			title: "Dune",
			type: MediaItemType.MOVIE,
		});
	});

	it("includes only the caller's rows", async () => {
		await insertMediaItem({ userId: USER_A, type: MediaItemType.BOOK });
		await insertMediaItem({ userId: USER_B, type: MediaItemType.BOOK });
		await insertSeries({
			userId: USER_B,
			name: "B series",
			type: MediaItemType.BOOK,
		});

		const backup = await exportBackup(USER_A);

		expect(backup.mediaItems).toHaveLength(1);
		expect(backup.series).toHaveLength(0);
	});
});

describe("importBackup round trip", () => {
	it("restores items, instances and series", async () => {
		const seriesId = await insertSeries({
			userId: USER_A,
			name: "Trilogy",
			type: MediaItemType.MOVIE,
		});
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			title: "Dune",
			seriesId,
			status: MediaItemStatus.COMPLETED,
		});
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-01-01",
			rating: "8.5",
		});

		await importBackup(await exportThroughJson(USER_A), USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.mediaItems).toHaveLength(1);
		expect(restored.mediaItemInstances).toHaveLength(1);
		expect(restored.series).toHaveLength(1);
		expect(restored.mediaItems[0].title).toBe("Dune");
		expect(restored.mediaItems[0].status).toBe(MediaItemStatus.COMPLETED);
	});

	it("preserves every moved field exactly", async () => {
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			title: "Dune",
			description: "A description",
			coverImageUrl: "http://example.test/a.jpg",
			releaseDate: "2021-10-22",
			externalId: "tmdb-438631",
			externalSource: "tmdb",
			metadata: { director: "Denis Villeneuve", runtime: 155 },
		});

		await importBackup(await exportThroughJson(USER_A), USER_A);

		const [row] = await testDb
			.select()
			.from(mediaItems)
			.where(eq(mediaItems.userId, USER_A));

		expect(row).toMatchObject({
			title: "Dune",
			description: "A description",
			coverImageUrl: "http://example.test/a.jpg",
			releaseDate: "2021-10-22",
			externalId: "tmdb-438631",
			externalSource: "tmdb",
			metadata: { director: "Denis Villeneuve", runtime: 155 },
		});
	});

	it("replaces only the caller's data", async () => {
		await insertMediaItem({ userId: USER_A, type: MediaItemType.BOOK });
		const itemB = await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.BOOK,
			title: "B's book",
		});

		await importBackup(
			{
				version: 2,
				exportedAt: TIMESTAMP,
				series: [],
				mediaItems: [],
				mediaItemInstances: [],
				views: [],
			},
			USER_A,
		);

		const remaining = await testDb.select().from(mediaItems);
		expect(remaining).toHaveLength(1);
		expect(remaining[0].id).toBe(itemB);
	});
});

describe("importBackup version 1 compatibility", () => {
	it("flattens the metadata array onto items", async () => {
		await importBackup(backupSchema.parse(buildV1Backup()), USER_A);

		const [row] = await testDb
			.select()
			.from(mediaItems)
			.where(eq(mediaItems.userId, USER_A));

		expect(row).toMatchObject({
			title: "Dune",
			description: "Legacy description",
			coverImageUrl: "http://example.test/legacy.jpg",
			releaseDate: "2021-10-22",
			externalId: "tmdb-438631",
			externalSource: "tmdb",
			metadata: { director: "Denis Villeneuve" },
		});
	});

	it("silently drops metadata rows no item references", async () => {
		await importBackup(backupSchema.parse(buildV1Backup()), USER_A);

		const rows = await testDb
			.select()
			.from(mediaItems)
			.where(eq(mediaItems.userId, USER_A));

		expect(rows).toHaveLength(1);
		expect(rows[0].externalId).not.toBe("hc-orphan");
	});

	it("skips an item whose metadata id is missing", async () => {
		const backup = buildV1Backup();
		backup.mediaItems[0].mediaItemMetadataId = 9999;

		await importBackup(backupSchema.parse(backup), USER_A);

		const rows = await testDb
			.select()
			.from(mediaItems)
			.where(eq(mediaItems.userId, USER_A));
		expect(rows).toHaveLength(0);
	});

	it("carries instances across the v1 flattening", async () => {
		await importBackup(backupSchema.parse(buildV1Backup()), USER_A);

		const backup = await exportBackup(USER_A);
		expect(backup.mediaItemInstances).toHaveLength(1);
		expect(backup.mediaItemInstances[0].reviewText).toBe("Legacy review");
	});

	// The importing user is always taken from the session, never the file.
	it("ignores a userId embedded in the file", async () => {
		const backup = buildV1Backup() as Record<string, unknown>;
		backup.userId = USER_B;

		await importBackup(backupSchema.parse(backup), USER_A);

		const rows = await testDb.select().from(mediaItems);
		expect(rows).toHaveLength(1);
		expect(rows[0].userId).toBe(USER_A);
	});
});

describe("backupSchema validation", () => {
	it("rejects an unrecognized version", () => {
		const parsed = backupSchema.safeParse({
			...buildV1Backup(),
			version: 3,
		});
		expect(parsed.success).toBe(false);
	});

	it("accepts both version 1 and version 2 documents", () => {
		expect(backupSchema.safeParse(buildV1Backup()).success).toBe(true);
		expect(
			backupSchema.safeParse({
				version: 2,
				exportedAt: TIMESTAMP,
				series: [],
				mediaItems: [],
				mediaItemInstances: [],
				views: [],
			}).success,
		).toBe(true);
	});
});
