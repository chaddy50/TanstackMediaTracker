import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";

// Redirect all db calls to the test database.
// vi.mock is hoisted before imports, so runItemQuery will see testDb.
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
	insertCreator,
	insertGenre,
	insertInstance,
	insertMediaItem,
	insertMetadata,
	insertTag,
	linkTag,
	truncateAll,
} from "#/tests/integration/helpers";
import { runItemQuery } from "../mediaItemQueries";

const USER = "test-user";

beforeEach(() => truncateAll());
afterEach(() => vi.useRealTimers());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Insert a minimal metadata + media item pair and return the mediaItem id. */
async function insertItem(
	overrides: {
		type?: MediaItemType;
		title?: string;
		status?: MediaItemStatus;
		purchaseStatus?: PurchaseStatus;
		seriesId?: number;
		creatorId?: number;
		genreId?: number;
		metadata?: Record<string, unknown>;
		releaseDate?: string;
		userId?: string;
	} = {},
): Promise<number> {
	const metadataId = await insertMetadata({
		type: overrides.type ?? MediaItemType.BOOK,
		title: overrides.title,
		metadata: overrides.metadata,
		releaseDate: overrides.releaseDate,
	});
	return insertMediaItem({
		userId: overrides.userId ?? USER,
		metadataId,
		status: overrides.status,
		purchaseStatus: overrides.purchaseStatus,
		seriesId: overrides.seriesId,
		creatorId: overrides.creatorId,
		genreId: overrides.genreId,
	});
}

// ---------------------------------------------------------------------------
// User scoping
// ---------------------------------------------------------------------------

describe("user scoping", () => {
	it("returns only items belonging to the requesting user", async () => {
		await insertItem({ title: "Mine" });
		await insertItem({ title: "Theirs", userId: "other-user" });

		const result = await runItemQuery({}, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Mine");
	});
});

// ---------------------------------------------------------------------------
// Individual filters
// ---------------------------------------------------------------------------

describe("mediaType filter", () => {
	it("returns only items matching the requested media type", async () => {
		await insertItem({ title: "Book", type: MediaItemType.BOOK });
		await insertItem({ title: "Movie", type: MediaItemType.MOVIE });

		const result = await runItemQuery(
			{ mediaTypes: [MediaItemType.BOOK] },
			USER,
		);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Book");
	});

	it("returns all items when no mediaType filter is set", async () => {
		await insertItem({ type: MediaItemType.BOOK });
		await insertItem({ type: MediaItemType.MOVIE });

		const result = await runItemQuery({}, USER);

		expect(result.items).toHaveLength(2);
	});
});

describe("status filter", () => {
	it("returns only items with a matching status", async () => {
		await insertItem({ title: "Done", status: MediaItemStatus.COMPLETED });
		await insertItem({ title: "Queued", status: MediaItemStatus.BACKLOG });

		const result = await runItemQuery(
			{ statuses: [MediaItemStatus.COMPLETED] },
			USER,
		);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Done");
	});
});

describe("purchaseStatus filter", () => {
	it("returns only items with a matching purchase status", async () => {
		await insertItem({
			title: "Bought",
			purchaseStatus: PurchaseStatus.PURCHASED,
		});
		await insertItem({
			title: "Wishlist",
			purchaseStatus: PurchaseStatus.WANT_TO_BUY,
		});

		const result = await runItemQuery(
			{ purchaseStatuses: [PurchaseStatus.PURCHASED] },
			USER,
		);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Bought");
	});
});

describe("tag filter", () => {
	it("returns only items that have the requested tag", async () => {
		const taggedId = await insertItem({ title: "Tagged" });
		await insertItem({ title: "Untagged" });
		const tagId = await insertTag({ userId: USER, name: "favorites" });
		await linkTag(taggedId, tagId);

		const result = await runItemQuery({ tags: ["favorites"] }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Tagged");
	});

	it("does not match tags belonging to a different user", async () => {
		const itemId = await insertItem({ title: "Mine" });
		const otherTagId = await insertTag({
			userId: "other-user",
			name: "favorites",
		});
		await linkTag(itemId, otherTagId);

		// The tag exists and is linked, but it belongs to other-user
		const result = await runItemQuery({ tags: ["favorites"] }, USER);

		expect(result.items).toHaveLength(0);
	});
});

describe("genre filter", () => {
	it("returns only items assigned to the requested genre", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fantasy" });
		await insertItem({ title: "Fantasy Book", genreId });
		await insertItem({ title: "No Genre" });

		const result = await runItemQuery({ genres: ["Fantasy"] }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Fantasy Book");
	});
});

describe("date range filter", () => {
	it("returns items that have an instance completed within the date range", async () => {
		const inRangeId = await insertItem({ title: "In Range" });
		const outOfRangeId = await insertItem({ title: "Out of Range" });
		await insertInstance({ mediaItemId: inRangeId, completedAt: "2025-06-15" });
		await insertInstance({
			mediaItemId: outOfRangeId,
			completedAt: "2024-12-31",
		});

		const result = await runItemQuery(
			{ completedDateStart: "2025-01-01", completedDateEnd: "2025-12-31" },
			USER,
		);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("In Range");
	});

	it("includes items completed exactly on the boundary dates", async () => {
		const itemId = await insertItem({ title: "Boundary" });
		await insertInstance({ mediaItemId: itemId, completedAt: "2025-01-01" });

		const result = await runItemQuery(
			{ completedDateStart: "2025-01-01", completedDateEnd: "2025-12-31" },
			USER,
		);

		expect(result.items).toHaveLength(1);
	});

	it("excludes items with no completed instances when a date filter is set", async () => {
		await insertItem({ title: "No Instances" });

		const result = await runItemQuery(
			{ completedDateStart: "2025-01-01" },
			USER,
		);

		expect(result.items).toHaveLength(0);
	});
});

describe("completedThisYear filter", () => {
	it("returns items completed in the current year and excludes items from prior years", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-03-01"));

		const thisYearId = await insertItem({ title: "This Year" });
		const lastYearId = await insertItem({ title: "Last Year" });
		await insertInstance({
			mediaItemId: thisYearId,
			completedAt: "2026-01-15",
		});
		await insertInstance({
			mediaItemId: lastYearId,
			completedAt: "2025-12-31",
		});

		const result = await runItemQuery({ completedThisYear: true }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("This Year");
	});
});

describe("titleQuery filter", () => {
	it("matches items whose title contains the query string (case-insensitive)", async () => {
		await insertItem({ title: "Dune" });
		await insertItem({ title: "Foundation" });

		const result = await runItemQuery({ titleQuery: "dun" }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Dune");
	});

	it("returns no results when nothing matches the title query", async () => {
		await insertItem({ title: "Dune" });

		const result = await runItemQuery({ titleQuery: "zzznomatch" }, USER);

		expect(result.items).toHaveLength(0);
	});

	it("matches on JSONB author field", async () => {
		await insertItem({
			title: "Some Novel",
			metadata: { author: "Brandon Sanderson" },
		});
		await insertItem({
			title: "Other Novel",
			metadata: { author: "Stephen King" },
		});

		const result = await runItemQuery({ titleQuery: "sanderson" }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Some Novel");
	});
});

describe("creatorQuery filter", () => {
	it("matches items linked to a creator whose name contains the query", async () => {
		const creatorId = await insertCreator({
			userId: USER,
			name: "Christopher Nolan",
		});
		await insertItem({
			title: "Inception",
			type: MediaItemType.MOVIE,
			creatorId,
		});
		await insertItem({ title: "Something Else", type: MediaItemType.MOVIE });

		const result = await runItemQuery({ creatorQuery: "nolan" }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Inception");
	});
});

// ---------------------------------------------------------------------------
// Combined filters
// ---------------------------------------------------------------------------

describe("combined filters", () => {
	it("does not over-filter: an item matching all criteria appears in results", async () => {
		// Matching: BOOK + COMPLETED + tagged "favorites"
		const matchId = await insertItem({
			title: "Match",
			type: MediaItemType.BOOK,
			status: MediaItemStatus.COMPLETED,
		});
		const tagId = await insertTag({ userId: USER, name: "favorites" });
		await linkTag(matchId, tagId);

		// Non-matches that each pass one or two of the three filters
		await insertItem({
			title: "Wrong type",
			type: MediaItemType.MOVIE,
			status: MediaItemStatus.COMPLETED,
		});
		await insertItem({
			title: "Wrong status",
			type: MediaItemType.BOOK,
			status: MediaItemStatus.BACKLOG,
		});

		const result = await runItemQuery(
			{
				mediaTypes: [MediaItemType.BOOK],
				statuses: [MediaItemStatus.COMPLETED],
				tags: ["favorites"],
			},
			USER,
		);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Match");
	});
});

// ---------------------------------------------------------------------------
// Sort fields
// ---------------------------------------------------------------------------

describe("sort by title", () => {
	it("returns items in ascending alphabetical order by sortTitle", async () => {
		await insertItem({ title: "Gamma" });
		await insertItem({ title: "Alpha" });
		await insertItem({ title: "Beta" });

		const result = await runItemQuery(
			{ sortBy: "title", sortDirection: "asc" },
			USER,
		);

		expect(result.items.map((item) => item.title)).toEqual([
			"Alpha",
			"Beta",
			"Gamma",
		]);
	});

	it("returns items in descending alphabetical order by sortTitle", async () => {
		await insertItem({ title: "Gamma" });
		await insertItem({ title: "Alpha" });
		await insertItem({ title: "Beta" });

		const result = await runItemQuery(
			{ sortBy: "title", sortDirection: "desc" },
			USER,
		);

		expect(result.items.map((item) => item.title)).toEqual([
			"Gamma",
			"Beta",
			"Alpha",
		]);
	});

	it("sorts by title ignoring leading 'The'", async () => {
		await insertItem({ title: "The Hobbit" });
		await insertItem({ title: "Dune" });

		// sortTitle for "The Hobbit" is "Hobbit", so it should come after "Dune"
		const result = await runItemQuery(
			{ sortBy: "title", sortDirection: "asc" },
			USER,
		);

		expect(result.items.map((item) => item.title)).toEqual([
			"Dune",
			"The Hobbit",
		]);
	});
});

describe("sort by rating", () => {
	it("returns items sorted descending by the latest completed instance rating", async () => {
		const highId = await insertItem({ title: "High Rated" });
		const lowId = await insertItem({ title: "Low Rated" });
		await insertInstance({
			mediaItemId: highId,
			completedAt: "2025-01-01",
			rating: "4.5",
		});
		await insertInstance({
			mediaItemId: lowId,
			completedAt: "2025-01-01",
			rating: "2.0",
		});

		const result = await runItemQuery(
			{ sortBy: "rating", sortDirection: "desc" },
			USER,
		);

		expect(result.items[0].title).toBe("High Rated");
		expect(result.items[1].title).toBe("Low Rated");
	});

	it("places items with no completed instances last when sorting by rating desc", async () => {
		const ratedId = await insertItem({ title: "Rated" });
		await insertItem({ title: "Unrated" });
		await insertInstance({
			mediaItemId: ratedId,
			completedAt: "2025-01-01",
			rating: "3.0",
		});

		const result = await runItemQuery(
			{ sortBy: "rating", sortDirection: "desc" },
			USER,
		);

		expect(result.items[0].title).toBe("Rated");
		expect(result.items[1].title).toBe("Unrated");
	});
});

describe("sort by completedAt", () => {
	it("returns items sorted descending by most recent completion date", async () => {
		const recentId = await insertItem({ title: "Recent" });
		const oldId = await insertItem({ title: "Old" });
		await insertInstance({ mediaItemId: recentId, completedAt: "2025-06-01" });
		await insertInstance({ mediaItemId: oldId, completedAt: "2025-01-01" });

		const result = await runItemQuery(
			{ sortBy: "completedAt", sortDirection: "desc" },
			USER,
		);

		expect(result.items[0].title).toBe("Recent");
		expect(result.items[1].title).toBe("Old");
	});
});

// ---------------------------------------------------------------------------
// LATERAL join — latest completed instance
// ---------------------------------------------------------------------------

describe("LATERAL join for latest instance", () => {
	it("returns the rating from the most recently completed instance, not the first or highest", async () => {
		const itemId = await insertItem({ title: "Re-read" });
		// First read: rating 5.0, completed earlier
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-01-01",
			rating: "5.0",
		});
		// Second read: rating 3.0, completed later — this is the "latest"
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2025-06-01",
			rating: "3.0",
		});

		const result = await runItemQuery({}, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].rating).toBe(3.0);
	});

	it("returns rating 0 for an item with no completed instances", async () => {
		const itemId = await insertItem({ title: "In Progress" });
		// Instance exists but no completedAt
		await insertInstance({ mediaItemId: itemId });

		const result = await runItemQuery({}, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].rating).toBe(0);
	});
});
