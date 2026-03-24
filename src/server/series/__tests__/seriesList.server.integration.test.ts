import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemStatus, MediaItemType } from "#/server/enums";

vi.mock("#/db/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/server/auth", () => ({ auth: {} }));
vi.mock("#/server/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

import { series } from "#/db/schema";
import { testDb } from "#/tests/integration/db";
import {
	insertMediaItem,
	insertMetadata,
	insertSeries,
	truncateAll,
} from "#/tests/integration/helpers";
import { eq } from "drizzle-orm";
import { runSeriesQuery } from "../seriesList.server";

const USER = "test-user";

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Insert a series row and return its id. */
async function makeSeries(
	overrides: {
		name?: string;
		type?: MediaItemType;
		status?: MediaItemStatus;
		isComplete?: boolean;
		rating?: string;
	} = {},
): Promise<number> {
	return insertSeries({
		userId: USER,
		name: overrides.name ?? "Test Series",
		type: overrides.type ?? MediaItemType.BOOK,
		status: overrides.status,
	});
}

/** Insert a media item belonging to a series and return its id. */
async function addItemToSeries(
	seriesId: number,
	userId = USER,
	metadataOverrides: {
		title?: string;
		metadata?: Record<string, unknown>;
	} = {},
): Promise<number> {
	const metadataId = await insertMetadata({
		type: MediaItemType.BOOK,
		...metadataOverrides,
	});
	return insertMediaItem({ userId, metadataId, seriesId });
}

/** Set isComplete and/or rating directly on a series row (fields not exposed by insertSeries). */
async function patchSeries(
	seriesId: number,
	patch: { isComplete?: boolean; rating?: string },
) {
	await testDb.update(series).set(patch).where(eq(series.id, seriesId));
}

// ---------------------------------------------------------------------------
// User scoping
// ---------------------------------------------------------------------------

describe("user scoping", () => {
	it("returns only series belonging to the requesting user", async () => {
		await insertSeries({
			userId: USER,
			name: "Mine",
			type: MediaItemType.BOOK,
		});
		await insertSeries({
			userId: "other-user",
			name: "Theirs",
			type: MediaItemType.BOOK,
		});

		const result = await runSeriesQuery({}, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].name).toBe("Mine");
	});
});

// ---------------------------------------------------------------------------
// Item count (the correlated subquery)
// ---------------------------------------------------------------------------

describe("item count", () => {
	it("returns 0 for a series with no items", async () => {
		await makeSeries({ name: "Empty" });

		const result = await runSeriesQuery({}, USER);

		expect(result.items[0].itemCount).toBe(0);
	});

	it("returns the correct count for a series with multiple items", async () => {
		const seriesId = await makeSeries({ name: "Three Items" });
		await addItemToSeries(seriesId);
		await addItemToSeries(seriesId);
		await addItemToSeries(seriesId);

		const result = await runSeriesQuery({}, USER);

		expect(result.items[0].itemCount).toBe(3);
	});

	it("counts each series independently — no cross-contamination", async () => {
		const seriesAId = await makeSeries({ name: "Series A" });
		const seriesBId = await makeSeries({ name: "Series B" });
		await addItemToSeries(seriesAId);
		await addItemToSeries(seriesAId);
		await addItemToSeries(seriesBId);

		const result = await runSeriesQuery(
			{ sortBy: "name", sortDirection: "asc" },
			USER,
		);

		const seriesA = result.items.find((item) => item.name === "Series A");
		const seriesB = result.items.find((item) => item.name === "Series B");
		expect(seriesA?.itemCount).toBe(2);
		expect(seriesB?.itemCount).toBe(1);
	});

	it("does not count items belonging to a different user", async () => {
		const seriesId = await makeSeries({ name: "Shared Series" });
		await addItemToSeries(seriesId, USER);
		await addItemToSeries(seriesId, "other-user");

		const result = await runSeriesQuery({}, USER);

		expect(result.items[0].itemCount).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

describe("mediaType filter", () => {
	it("returns only series of the requested type", async () => {
		await makeSeries({ name: "Books", type: MediaItemType.BOOK });
		await makeSeries({ name: "Movies", type: MediaItemType.MOVIE });

		const result = await runSeriesQuery(
			{ mediaTypes: [MediaItemType.BOOK] },
			USER,
		);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].name).toBe("Books");
	});
});

describe("status filter", () => {
	it("returns only series with a matching status", async () => {
		await makeSeries({ name: "Done", status: MediaItemStatus.COMPLETED });
		await makeSeries({ name: "Queued", status: MediaItemStatus.BACKLOG });

		const result = await runSeriesQuery(
			{ statuses: [MediaItemStatus.COMPLETED] },
			USER,
		);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].name).toBe("Done");
	});
});

describe("isSeriesComplete filter", () => {
	it("returns only complete series when isSeriesComplete is true", async () => {
		const completeId = await makeSeries({ name: "Complete" });
		await makeSeries({ name: "Ongoing" });
		await patchSeries(completeId, { isComplete: true });

		const result = await runSeriesQuery({ isSeriesComplete: true }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].name).toBe("Complete");
	});

	it("returns only incomplete series when isSeriesComplete is false", async () => {
		const completeId = await makeSeries({ name: "Complete" });
		await makeSeries({ name: "Ongoing" });
		await patchSeries(completeId, { isComplete: true });

		const result = await runSeriesQuery({ isSeriesComplete: false }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].name).toBe("Ongoing");
	});

	it("returns all series when isSeriesComplete is not set", async () => {
		const completeId = await makeSeries({ name: "Complete" });
		await makeSeries({ name: "Ongoing" });
		await patchSeries(completeId, { isComplete: true });

		const result = await runSeriesQuery({}, USER);

		expect(result.items).toHaveLength(2);
	});
});

// ---------------------------------------------------------------------------
// Sort fields
// ---------------------------------------------------------------------------

describe("sort by name", () => {
	it("returns series in ascending alphabetical order by sortName (default)", async () => {
		await makeSeries({ name: "Gamma" });
		await makeSeries({ name: "Alpha" });
		await makeSeries({ name: "Beta" });

		const result = await runSeriesQuery({}, USER);

		expect(result.items.map((item) => item.name)).toEqual([
			"Alpha",
			"Beta",
			"Gamma",
		]);
	});

	it("sorts by name ignoring leading 'The'", async () => {
		await makeSeries({ name: "The Expanse" });
		await makeSeries({ name: "Dune" });

		const result = await runSeriesQuery(
			{ sortBy: "name", sortDirection: "asc" },
			USER,
		);

		// sortName for "The Expanse" is "Expanse", which comes after "Dune"
		expect(result.items.map((item) => item.name)).toEqual([
			"Dune",
			"The Expanse",
		]);
	});
});

describe("sort by itemCount", () => {
	it("returns series sorted descending by item count", async () => {
		const largeId = await makeSeries({ name: "Large" });
		const smallId = await makeSeries({ name: "Small" });
		await addItemToSeries(largeId);
		await addItemToSeries(largeId);
		await addItemToSeries(largeId);
		await addItemToSeries(smallId);

		const result = await runSeriesQuery(
			{ sortBy: "itemCount", sortDirection: "desc" },
			USER,
		);

		expect(result.items[0].name).toBe("Large");
		expect(result.items[1].name).toBe("Small");
	});
});

// ---------------------------------------------------------------------------
// Rating parsing
// ---------------------------------------------------------------------------

describe("rating field", () => {
	it("parses a decimal rating string to a number", async () => {
		const seriesId = await makeSeries({ name: "Rated" });
		await patchSeries(seriesId, { rating: "4.5" });

		const result = await runSeriesQuery({}, USER);

		expect(result.items[0].rating).toBe(4.5);
	});

	it("returns 0 when rating is null", async () => {
		await makeSeries({ name: "Unrated" });

		const result = await runSeriesQuery({}, USER);

		expect(result.items[0].rating).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// titleQuery filter
// ---------------------------------------------------------------------------

describe("titleQuery filter", () => {
	it("matches on series name (case-insensitive)", async () => {
		await makeSeries({ name: "The Stormlight Archive" });
		await makeSeries({ name: "Dune" });

		const result = await runSeriesQuery({ titleQuery: "stormlight" }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].name).toBe("The Stormlight Archive");
	});

	it("returns no results when nothing matches", async () => {
		await makeSeries({ name: "The Stormlight Archive" });

		const result = await runSeriesQuery({ titleQuery: "zzznomatch" }, USER);

		expect(result.items).toHaveLength(0);
	});

	it("matches on item title within the series", async () => {
		const matchingId = await makeSeries({ name: "Series A" });
		const nonMatchingId = await makeSeries({ name: "Series B" });
		await addItemToSeries(matchingId, USER, { title: "The Way of Kings" });
		await addItemToSeries(nonMatchingId, USER, { title: "Something Else" });

		const result = await runSeriesQuery({ titleQuery: "way of kings" }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].name).toBe("Series A");
	});

	it("matches on author in item metadata", async () => {
		const matchingId = await makeSeries({ name: "The Way of Kings" });
		const nonMatchingId = await makeSeries({ name: "The Dark Tower" });
		await addItemToSeries(matchingId, USER, {
			metadata: { author: "Brandon Sanderson" },
		});
		await addItemToSeries(nonMatchingId, USER, {
			metadata: { author: "Stephen King" },
		});

		const result = await runSeriesQuery({ titleQuery: "sanderson" }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].name).toBe("The Way of Kings");
	});

	it("matches on director in item metadata", async () => {
		const matchingId = await makeSeries({ name: "The Dark Knight" });
		const nonMatchingId = await makeSeries({ name: "Terminator" });
		await addItemToSeries(matchingId, USER, {
			metadata: { director: "Christopher Nolan" },
		});
		await addItemToSeries(nonMatchingId, USER, {
			metadata: { director: "Steven Spielberg" },
		});

		const result = await runSeriesQuery({ titleQuery: "nolan" }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].name).toBe("The Dark Knight");
	});

	it("matches on developer in item metadata", async () => {
		const matchingId = await makeSeries({ name: "Action RPGs" });
		const nonMatchingId = await makeSeries({ name: "Platform Games" });
		await addItemToSeries(matchingId, USER, {
			metadata: { developer: "FromSoftware" },
		});
		await addItemToSeries(nonMatchingId, USER, {
			metadata: { developer: "Nintendo" },
		});

		const result = await runSeriesQuery({ titleQuery: "fromsoftware" }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].name).toBe("Action RPGs");
	});

	it("does not return the same series multiple times when several items match", async () => {
		const seriesId = await makeSeries({ name: "Prolific Author Series" });
		await addItemToSeries(seriesId, USER, {
			metadata: { author: "Brandon Sanderson" },
		});
		await addItemToSeries(seriesId, USER, {
			metadata: { author: "Brandon Sanderson" },
		});

		const result = await runSeriesQuery({ titleQuery: "sanderson" }, USER);

		expect(result.items).toHaveLength(1);
	});

	it("does not match items belonging to a different user's series", async () => {
		const seriesId = await makeSeries({ name: "My Series" });
		await addItemToSeries(seriesId, "other-user", {
			metadata: { author: "Brandon Sanderson" },
		});

		const result = await runSeriesQuery({ titleQuery: "sanderson" }, USER);

		expect(result.items).toHaveLength(0);
	});
});
