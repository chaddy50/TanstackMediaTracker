import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#/db/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/server/auth", () => ({ auth: {} }));
vi.mock("#/server/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));
vi.mock("#/server/api/itunes", () => ({
	fetchPodcastChannelInfo: vi.fn().mockResolvedValue(null),
	fetchPodcastEpisodes: vi.fn().mockResolvedValue([]),
	searchPodcasts: vi.fn().mockResolvedValue([]),
}));

import { count } from "drizzle-orm";

import { mediaItemMetadata, mediaItems, series } from "#/db/schema";
import { MediaItemStatus } from "#/server/enums";
import { testDb } from "#/tests/integration/db";
import { truncateAll } from "#/tests/integration/helpers";
import { handleAddPodcastArc } from "../search.server";

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

		const [seriesCount] = await testDb
			.select({ count: count() })
			.from(series);
		const [metadataCount] = await testDb
			.select({ count: count() })
			.from(mediaItemMetadata);
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
			.from(mediaItemMetadata);
		expect(metadataCount?.count).toBe(1);
	});
});
