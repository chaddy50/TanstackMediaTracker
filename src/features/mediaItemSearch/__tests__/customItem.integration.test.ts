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
vi.mock("#/features/mediaItemSearch/api/hardcover", () => ({
	search: vi.fn().mockResolvedValue([]),
	fetchSeriesInfo: vi.fn().mockResolvedValue(null),
	fetchCreatorBio: vi.fn().mockResolvedValue(null),
}));
vi.mock("#/features/mediaItemSearch/api/tmdb", () => ({
	search: vi.fn().mockResolvedValue([]),
	fetchMovieDetails: vi.fn().mockResolvedValue({}),
	fetchTvShowDetails: vi.fn().mockResolvedValue({}),
	fetchCreatorBio: vi.fn().mockResolvedValue(null),
}));
vi.mock("#/features/mediaItemSearch/api/itunes", () => ({
	searchPodcasts: vi.fn().mockResolvedValue([]),
	fetchPodcastChannelInfo: vi.fn().mockResolvedValue(null),
}));
vi.mock("#/features/mediaItemSearch/api/igdb", () => ({
	search: vi.fn().mockResolvedValue([]),
}));

import { eq } from "drizzle-orm";
import { mediaItems } from "#/database/schema";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";
import { testDb } from "#/tests/integration/db";
import { truncateAll } from "#/tests/integration/helpers";
import { handleCreateCustomItem } from "../mediaItemSearch.server";

const USER_A = "user-a";
const USER_B = "user-b";

const CUSTOM_INPUT = {
	type: MediaItemType.BOOK,
	title: "My Unpublished Manuscript",
	metadata: { author: "Me" },
};

beforeEach(() => truncateAll());

describe("handleCreateCustomItem", () => {
	it("stores the creating user's id and a custom source", async () => {
		const { mediaItemId } = await handleCreateCustomItem(CUSTOM_INPUT, USER_A);

		const [row] = await testDb
			.select()
			.from(mediaItems)
			.where(eq(mediaItems.id, mediaItemId));

		expect(row?.userId).toBe(USER_A);
		expect(row?.externalSource).toBe("custom");
		expect(row?.title).toBe("My Unpublished Manuscript");
		expect(row?.status).toBe(MediaItemStatus.BACKLOG);
	});

	it("gives two users' identically-titled custom items distinct external ids", async () => {
		const first = await handleCreateCustomItem(CUSTOM_INPUT, USER_A);
		const second = await handleCreateCustomItem(CUSTOM_INPUT, USER_B);

		const rows = await testDb.select().from(mediaItems);
		expect(rows).toHaveLength(2);
		expect(first.mediaItemId).not.toBe(second.mediaItemId);
		// A fresh UUID per custom item keeps them off the unique index.
		expect(rows[0].externalId).not.toBe(rows[1].externalId);
	});

	it("lets one user create the same custom title twice", async () => {
		await handleCreateCustomItem(CUSTOM_INPUT, USER_A);
		await handleCreateCustomItem(CUSTOM_INPUT, USER_A);

		const rows = await testDb.select().from(mediaItems);
		expect(rows).toHaveLength(2);
	});
});
