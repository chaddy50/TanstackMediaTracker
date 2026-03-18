import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemType } from "#/lib/enums";

vi.mock("#/db/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/lib/auth", () => ({ auth: {} }));
vi.mock("#/lib/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

import {
	insertGenre,
	insertInstance,
	insertMediaItem,
	insertMetadata,
	truncateAll,
} from "#/tests/integration/helpers";
import { fetchItemsCompletedByGenre } from "../reports/reportTypes/completedByGenre.server";

const USER = "test-user";
const OTHER_USER = "other-user";

beforeEach(() => truncateAll());

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2024-03-15"));
});

afterEach(() => {
	vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// genre exclusion
// ---------------------------------------------------------------------------

describe("genre exclusion", () => {
	it("genres with no completions don't appear", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		await insertMediaItem({ userId: USER, metadataId, genreId });
		// No instance inserted — nothing completed

		const result = await fetchItemsCompletedByGenre(USER, 3);

		expect(result).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// null genre exclusion
// ---------------------------------------------------------------------------

describe("null genre exclusion", () => {
	it("items with no genre are excluded", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		// No genreId — item has no genre
		const itemId = await insertMediaItem({ userId: USER, metadataId });
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });

		const result = await fetchItemsCompletedByGenre(USER, 3);

		expect(result).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// genre grouping and counting
// ---------------------------------------------------------------------------

describe("genre grouping and counting", () => {
	it("counts distinct items per genre", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId1 = await insertMediaItem({ userId: USER, metadataId, genreId });
		const itemId2 = await insertMediaItem({ userId: USER, metadataId, genreId });
		await insertInstance({ mediaItemId: itemId1, completedAt: "2024-03-05" });
		await insertInstance({ mediaItemId: itemId2, completedAt: "2024-03-10" });

		const result = await fetchItemsCompletedByGenre(USER, 3);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(2);
	});

	it("counts an item completed twice only once", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({ userId: USER, metadataId, genreId });
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-05" });
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });

		const result = await fetchItemsCompletedByGenre(USER, 3);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(1);
	});

	it("multiple genres appear separately", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const genreIdA = await insertGenre({ userId: USER, name: "Fiction" });
		const genreIdB = await insertGenre({ userId: USER, name: "History" });
		const itemIdA = await insertMediaItem({ userId: USER, metadataId, genreId: genreIdA });
		const itemIdB = await insertMediaItem({ userId: USER, metadataId, genreId: genreIdB });
		await insertInstance({ mediaItemId: itemIdA, completedAt: "2024-03-05" });
		await insertInstance({ mediaItemId: itemIdB, completedAt: "2024-03-10" });

		const result = await fetchItemsCompletedByGenre(USER, 3);
		const genreNames = result.map((row) => row.genre);

		expect(genreNames).toContain("Fiction");
		expect(genreNames).toContain("History");
	});
});

// ---------------------------------------------------------------------------
// media type filter
// ---------------------------------------------------------------------------

describe("media type filter", () => {
	it("returns all types when no filter provided", async () => {
		const bookMetadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const movieMetadataId = await insertMetadata({ type: MediaItemType.MOVIE });
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const bookItemId = await insertMediaItem({ userId: USER, metadataId: bookMetadataId, genreId });
		const movieItemId = await insertMediaItem({ userId: USER, metadataId: movieMetadataId, genreId });
		await insertInstance({ mediaItemId: bookItemId, completedAt: "2024-03-05" });
		await insertInstance({ mediaItemId: movieItemId, completedAt: "2024-03-10" });

		const result = await fetchItemsCompletedByGenre(USER, 3);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(2);
	});

	it("filters to specified media type only", async () => {
		const bookMetadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const movieMetadataId = await insertMetadata({ type: MediaItemType.MOVIE });
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const bookItemId = await insertMediaItem({ userId: USER, metadataId: bookMetadataId, genreId });
		const movieItemId = await insertMediaItem({ userId: USER, metadataId: movieMetadataId, genreId });
		await insertInstance({ mediaItemId: bookItemId, completedAt: "2024-03-05" });
		await insertInstance({ mediaItemId: movieItemId, completedAt: "2024-03-10" });

		const result = await fetchItemsCompletedByGenre(USER, 3, [MediaItemType.BOOK]);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(1);
	});

	it("returns empty when no items match the type filter", async () => {
		const bookMetadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const bookItemId = await insertMediaItem({ userId: USER, metadataId: bookMetadataId, genreId });
		await insertInstance({ mediaItemId: bookItemId, completedAt: "2024-03-05" });

		const result = await fetchItemsCompletedByGenre(USER, 3, [MediaItemType.MOVIE]);

		expect(result).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// date range
// ---------------------------------------------------------------------------

describe("date range", () => {
	it("excludes items completed before the cutoff", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({ userId: USER, metadataId, genreId });
		// 4 months ago — outside a 3-month window
		await insertInstance({ mediaItemId: itemId, completedAt: "2023-11-10" });

		const result = await fetchItemsCompletedByGenre(USER, 3);

		expect(result).toHaveLength(0);
	});

	it("includes items completed within the window", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({ userId: USER, metadataId, genreId });
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });

		const result = await fetchItemsCompletedByGenre(USER, 3);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// user scoping
// ---------------------------------------------------------------------------

describe("user scoping", () => {
	it("only returns data for the requesting user", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const userGenreId = await insertGenre({ userId: USER, name: "Fiction" });
		const otherGenreId = await insertGenre({ userId: OTHER_USER, name: "Fiction" });
		const userItemId = await insertMediaItem({ userId: USER, metadataId, genreId: userGenreId });
		const otherItemId = await insertMediaItem({ userId: OTHER_USER, metadataId, genreId: otherGenreId });
		await insertInstance({ mediaItemId: userItemId, completedAt: "2024-03-10" });
		await insertInstance({ mediaItemId: otherItemId, completedAt: "2024-03-10" });

		const userResult = await fetchItemsCompletedByGenre(USER, 3);
		const otherResult = await fetchItemsCompletedByGenre(OTHER_USER, 3);

		expect(userResult.find((row) => row.genre === "Fiction")?.value).toBe(1);
		expect(otherResult.find((row) => row.genre === "Fiction")?.value).toBe(1);
	});
});
