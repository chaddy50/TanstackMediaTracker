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

import { MediaItemType } from "#/lib/enums";
import {
	insertGenre,
	insertInstance,
	insertMediaItem,
	truncateAll,
} from "#/tests/integration/helpers";
import { fetchGenreDetails } from "../genres.server";

const USER_A = "user-a";
const USER_B = "user-b";

const SHARED_EXTERNAL = {
	externalId: "hc-shared",
	externalSource: "hardcover",
} as const;

beforeEach(() => truncateAll());

describe("fetchGenreDetails", () => {
	it("returns the genre's own items with their descriptive data", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Fiction" });
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Dune",
			coverImageUrl: "http://example.test/a.jpg",
			genreId,
		});

		const details = await fetchGenreDetails(genreId, USER_A);

		expect(details.name).toBe("Fiction");
		expect(details.items).toHaveLength(1);
		expect(details.items[0]).toMatchObject({
			title: "Dune",
			coverImageUrl: "http://example.test/a.jpg",
		});
	});

	it("excludes another user's item sharing the same external identity", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Fiction" });
		const otherGenreId = await insertGenre({ userId: USER_B, name: "Fiction" });
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Mine",
			genreId,
			...SHARED_EXTERNAL,
		});
		await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.BOOK,
			title: "Theirs",
			genreId: otherGenreId,
			...SHARED_EXTERNAL,
		});

		const details = await fetchGenreDetails(genreId, USER_A);

		expect(details.items.map((item) => item.title)).toEqual(["Mine"]);
	});

	it("orders by releaseDate then sortTitle", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Fiction" });
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "The Later One",
			releaseDate: "2024-01-01",
			genreId,
		});
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "An Earlier One",
			releaseDate: "2020-01-01",
			genreId,
		});

		const details = await fetchGenreDetails(genreId, USER_A);

		expect(details.items.map((item) => item.title)).toEqual([
			"An Earlier One",
			"The Later One",
		]);
	});

	it("attaches the latest completed rating per item", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Fiction" });
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			genreId,
		});
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-01-01",
			rating: "7.0",
		});
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2025-01-01",
			rating: "9.0",
		});

		const details = await fetchGenreDetails(genreId, USER_A);

		expect(details.items[0].rating).toBe(9);
	});

	it("rejects a genre owned by another user", async () => {
		const genreB = await insertGenre({ userId: USER_B, name: "Fiction" });

		await expect(fetchGenreDetails(genreB, USER_A)).rejects.toThrow(
			/not found/,
		);
	});

	it("returns an empty item list for a genre with no items", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Empty" });

		const details = await fetchGenreDetails(genreId, USER_A);

		expect(details.items).toEqual([]);
	});
});
