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
vi.mock("#/features/mediaItemSearch/api/itunes", () => ({
	fetchPodcastChannelInfo: vi.fn().mockResolvedValue(null),
	fetchPodcastEpisodes: vi.fn().mockResolvedValue([]),
	searchPodcasts: vi.fn().mockResolvedValue([]),
}));

import { asc, count, eq } from "drizzle-orm";

import { mediaItems, series } from "#/database/schema";
import { MediaItemStatus } from "#/lib/enums";
import { testDb } from "#/tests/integration/db";
import { truncateAll } from "#/tests/integration/helpers";
import {
	handleAddPodcastArc,
	handleUpdatePodcastArcEpisodes,
} from "../mediaItemSearch.server";

const USER = "test-user";

const BASE_ARC_INPUT = {
	podcastTitle: "Serial",
	arcTitle: "Season 1",
	arcMetadata: {
		creator: "Sarah Koenig",
		episodeGuids: ["guid-ep-1", "guid-ep-2", "guid-ep-3"],
		episodeNumbers: [1, 2, 3],
	},
	status: MediaItemStatus.COMPLETED,
};

beforeEach(() => truncateAll());

describe("handleAddPodcastArc", () => {
	it("calling twice with the same arc does not create duplicate series or metadata rows", async () => {
		const firstResult = await handleAddPodcastArc(BASE_ARC_INPUT, USER);
		const secondResult = await handleAddPodcastArc(BASE_ARC_INPUT, USER);

		const [seriesCount] = await testDb.select({ count: count() }).from(series);
		const [metadataCount] = await testDb
			.select({ count: count() })
			.from(mediaItems);
		const [itemsCount] = await testDb
			.select({ count: count() })
			.from(mediaItems);

		expect(seriesCount?.count).toBe(1);
		expect(metadataCount?.count).toBe(1);
		expect(itemsCount?.count).toBe(1);
		expect(secondResult.mediaItemId).toBe(firstResult.mediaItemId);
	});

	it("treats arcs with the same episode GUIDs but different titles as the same arc", async () => {
		await handleAddPodcastArc(BASE_ARC_INPUT, USER);
		await handleAddPodcastArc(
			{ ...BASE_ARC_INPUT, arcTitle: "The Adnan Syed Story" },
			USER,
		);

		const [metadataCount] = await testDb
			.select({ count: count() })
			.from(mediaItems);
		expect(metadataCount?.count).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Per-user ownership of the same arc
// ---------------------------------------------------------------------------

const USER_B = "test-user-b";

describe("two users adding the same podcast arc", () => {
	it("gives each user their own arc item", async () => {
		const forA = await handleAddPodcastArc(BASE_ARC_INPUT, USER);
		const forB = await handleAddPodcastArc(BASE_ARC_INPUT, USER_B);

		expect(forA.mediaItemId).not.toBe(forB.mediaItemId);

		const rows = await testDb
			.select({
				userId: mediaItems.userId,
				externalId: mediaItems.externalId,
			})
			.from(mediaItems)
			.orderBy(asc(mediaItems.userId));

		expect(rows).toHaveLength(2);
		expect(rows.map((row) => row.userId)).toEqual([USER, USER_B]);
		// The deterministic GUID-derived externalId is identical for both.
		expect(rows[0].externalId).toBe(rows[1].externalId);
	});

	it("does not let one user's add overwrite the other's retitled arc", async () => {
		const { mediaItemId } = await handleAddPodcastArc(BASE_ARC_INPUT, USER);
		await testDb
			.update(mediaItems)
			.set({ title: "A's own arc name" })
			.where(eq(mediaItems.id, mediaItemId));

		await handleAddPodcastArc(BASE_ARC_INPUT, USER_B);

		const [rowA] = await testDb
			.select({ title: mediaItems.title })
			.from(mediaItems)
			.where(eq(mediaItems.id, mediaItemId));
		expect(rowA?.title).toBe("A's own arc name");
	});
});

describe("handleUpdatePodcastArcEpisodes", () => {
	it("retitles the caller's arc without touching the other user's", async () => {
		const forA = await handleAddPodcastArc(BASE_ARC_INPUT, USER);
		const forB = await handleAddPodcastArc(BASE_ARC_INPUT, USER_B);

		await handleUpdatePodcastArcEpisodes(
			{
				mediaItemId: forA.mediaItemId,
				arcTitle: "Season One, revised",
				arcMetadata: { ...BASE_ARC_INPUT.arcMetadata },
			},
			USER,
		);

		const [rowA] = await testDb
			.select({ title: mediaItems.title })
			.from(mediaItems)
			.where(eq(mediaItems.id, forA.mediaItemId));
		const [rowB] = await testDb
			.select({ title: mediaItems.title })
			.from(mediaItems)
			.where(eq(mediaItems.id, forB.mediaItemId));

		expect(rowA?.title).toBe("Season One, revised");
		expect(rowB?.title).toBe("Season 1");
	});

	it("refuses a mediaItemId the caller does not own", async () => {
		const forB = await handleAddPodcastArc(BASE_ARC_INPUT, USER_B);

		await expect(
			handleUpdatePodcastArcEpisodes(
				{
					mediaItemId: forB.mediaItemId,
					arcTitle: "Hijacked",
					arcMetadata: { ...BASE_ARC_INPUT.arcMetadata },
				},
				USER,
			),
		).rejects.toThrow("Unauthorized");

		const [rowB] = await testDb
			.select({ title: mediaItems.title })
			.from(mediaItems)
			.where(eq(mediaItems.id, forB.mediaItemId));
		expect(rowB?.title).toBe("Season 1");
	});
});
