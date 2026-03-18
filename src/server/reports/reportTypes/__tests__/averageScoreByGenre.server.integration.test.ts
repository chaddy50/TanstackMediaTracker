import { beforeEach, describe, expect, it, vi } from "vitest";

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
import { fetchAverageScoreByGenre } from "../averageScoreByGenre.server";

const USER = "test-user";
const OTHER_USER = "other-user";
const START = "2024-01-01";
const END = "2024-03-15";

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// exclusions
// ---------------------------------------------------------------------------

describe("exclusions", () => {
	it("genres with no rated completions don't appear", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		await insertMediaItem({ userId: USER, metadataId, genreId });
		// No instance inserted

		const result = await fetchAverageScoreByGenre(USER, START, END);

		expect(result).toHaveLength(0);
	});

	it("items with no genre are excluded", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const itemId = await insertMediaItem({ userId: USER, metadataId });
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-03-10",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);

		expect(result).toHaveLength(0);
	});

	it("items with a null rating are excluded", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({ userId: USER, metadataId, genreId });
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });
		// No rating provided

		const result = await fetchAverageScoreByGenre(USER, START, END);

		expect(result).toHaveLength(0);
	});

	it("items with a null completedAt are excluded", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({ userId: USER, metadataId, genreId });
		await insertInstance({ mediaItemId: itemId, rating: "8" });
		// No completedAt provided

		const result = await fetchAverageScoreByGenre(USER, START, END);

		expect(result).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// score averaging
// ---------------------------------------------------------------------------

describe("score averaging", () => {
	it("returns the rating for a single rated item", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({ userId: USER, metadataId, genreId });
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-03-10",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(8);
	});

	it("averages ratings across multiple items in the same genre", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId1 = await insertMediaItem({
			userId: USER,
			metadataId,
			genreId,
		});
		const itemId2 = await insertMediaItem({
			userId: USER,
			metadataId,
			genreId,
		});
		await insertInstance({
			mediaItemId: itemId1,
			completedAt: "2024-03-05",
			rating: "6",
		});
		await insertInstance({
			mediaItemId: itemId2,
			completedAt: "2024-03-10",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(7);
	});

	it("rounds the average to 1 decimal place", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId1 = await insertMediaItem({
			userId: USER,
			metadataId,
			genreId,
		});
		const itemId2 = await insertMediaItem({
			userId: USER,
			metadataId,
			genreId,
		});
		await insertInstance({
			mediaItemId: itemId1,
			completedAt: "2024-03-05",
			rating: "7",
		});
		await insertInstance({
			mediaItemId: itemId2,
			completedAt: "2024-03-10",
			rating: "8",
		});
		await insertInstance({
			mediaItemId: itemId2,
			completedAt: "2024-03-10",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(7.7);
	});

	it("multiple genres appear separately with their own averages", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const genreIdA = await insertGenre({ userId: USER, name: "Fiction" });
		const genreIdB = await insertGenre({ userId: USER, name: "History" });
		const itemIdA = await insertMediaItem({
			userId: USER,
			metadataId,
			genreId: genreIdA,
		});
		const itemIdB = await insertMediaItem({
			userId: USER,
			metadataId,
			genreId: genreIdB,
		});
		await insertInstance({
			mediaItemId: itemIdA,
			completedAt: "2024-03-05",
			rating: "9",
		});
		await insertInstance({
			mediaItemId: itemIdB,
			completedAt: "2024-03-10",
			rating: "6",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);

		expect(result.find((row) => row.genre === "Fiction")?.value).toBe(9);
		expect(result.find((row) => row.genre === "History")?.value).toBe(6);
	});
});

// ---------------------------------------------------------------------------
// instance counting
// ---------------------------------------------------------------------------

describe("instance counting", () => {
	it("both instances contribute when an item is completed twice", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({ userId: USER, metadataId, genreId });
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-03-05",
			rating: "6",
		});
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-03-10",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(7);
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
		const bookItemId = await insertMediaItem({
			userId: USER,
			metadataId: bookMetadataId,
			genreId,
		});
		const movieItemId = await insertMediaItem({
			userId: USER,
			metadataId: movieMetadataId,
			genreId,
		});
		await insertInstance({
			mediaItemId: bookItemId,
			completedAt: "2024-03-05",
			rating: "6",
		});
		await insertInstance({
			mediaItemId: movieItemId,
			completedAt: "2024-03-10",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(7);
	});

	it("filters to specified media type only", async () => {
		const bookMetadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const movieMetadataId = await insertMetadata({ type: MediaItemType.MOVIE });
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const bookItemId = await insertMediaItem({
			userId: USER,
			metadataId: bookMetadataId,
			genreId,
		});
		const movieItemId = await insertMediaItem({
			userId: USER,
			metadataId: movieMetadataId,
			genreId,
		});
		await insertInstance({
			mediaItemId: bookItemId,
			completedAt: "2024-03-05",
			rating: "6",
		});
		await insertInstance({
			mediaItemId: movieItemId,
			completedAt: "2024-03-10",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END, [
			MediaItemType.BOOK,
		]);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(6);
	});

	it("returns empty when no items match the type filter", async () => {
		const bookMetadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const bookItemId = await insertMediaItem({
			userId: USER,
			metadataId: bookMetadataId,
			genreId,
		});
		await insertInstance({
			mediaItemId: bookItemId,
			completedAt: "2024-03-05",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END, [
			MediaItemType.MOVIE,
		]);

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
		// 4 months ago — outside the window
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2023-11-10",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);

		expect(result).toHaveLength(0);
	});

	it("excludes future-dated items", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({ userId: USER, metadataId, genreId });
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2025-01-01",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);

		expect(result).toHaveLength(0);
	});

	it("includes items completed within the window", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({ userId: USER, metadataId, genreId });
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-03-10",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(8);
	});
});

// ---------------------------------------------------------------------------
// ordering
// ---------------------------------------------------------------------------

describe("ordering", () => {
	it("returns genres ordered by average score descending", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const genreIdA = await insertGenre({ userId: USER, name: "Fiction" });
		const genreIdB = await insertGenre({ userId: USER, name: "History" });
		const itemIdA = await insertMediaItem({
			userId: USER,
			metadataId,
			genreId: genreIdA,
		});
		const itemIdB = await insertMediaItem({
			userId: USER,
			metadataId,
			genreId: genreIdB,
		});
		await insertInstance({
			mediaItemId: itemIdA,
			completedAt: "2024-03-05",
			rating: "6",
		});
		await insertInstance({
			mediaItemId: itemIdB,
			completedAt: "2024-03-10",
			rating: "9",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);

		expect(result[0].genre).toBe("History");
		expect(result[1].genre).toBe("Fiction");
	});
});

// ---------------------------------------------------------------------------
// user scoping
// ---------------------------------------------------------------------------

describe("user scoping", () => {
	it("only returns data for the requesting user", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const userGenreId = await insertGenre({ userId: USER, name: "Fiction" });
		const otherGenreId = await insertGenre({
			userId: OTHER_USER,
			name: "Fiction",
		});
		const userItemId = await insertMediaItem({
			userId: USER,
			metadataId,
			genreId: userGenreId,
		});
		const otherItemId = await insertMediaItem({
			userId: OTHER_USER,
			metadataId,
			genreId: otherGenreId,
		});
		await insertInstance({
			mediaItemId: userItemId,
			completedAt: "2024-03-10",
			rating: "8",
		});
		await insertInstance({
			mediaItemId: otherItemId,
			completedAt: "2024-03-10",
			rating: "4",
		});

		const userResult = await fetchAverageScoreByGenre(USER, START, END);
		const otherResult = await fetchAverageScoreByGenre(OTHER_USER, START, END);

		expect(userResult.find((row) => row.genre === "Fiction")?.value).toBe(8);
		expect(otherResult.find((row) => row.genre === "Fiction")?.value).toBe(4);
	});
});
