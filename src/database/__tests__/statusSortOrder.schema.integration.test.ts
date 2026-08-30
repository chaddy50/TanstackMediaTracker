import { asc, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemStatus, MediaItemType } from "#/lib/enums";

// Redirect all db calls to the test database.
vi.mock("#/database/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/features/screens/auth", () => ({ auth: {} }));
vi.mock("#/features/screens/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

import { mediaItems, series } from "#/database/schema";
import { testDb } from "#/tests/integration/db";
import {
	insertMediaItem,
	insertSeries,
	truncateAll,
} from "#/tests/integration/helpers";

const USER = "test-user";

const ALL_STATUSES = [
	MediaItemStatus.DROPPED,
	MediaItemStatus.IN_PROGRESS,
	MediaItemStatus.BACKLOG,
	MediaItemStatus.COMPLETED,
	MediaItemStatus.NEXT_UP,
	MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
	MediaItemStatus.ON_HOLD,
];

const EXPECTED_RANKING = [
	MediaItemStatus.BACKLOG,
	MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
	MediaItemStatus.ON_HOLD,
	MediaItemStatus.NEXT_UP,
	MediaItemStatus.IN_PROGRESS,
	MediaItemStatus.COMPLETED,
	MediaItemStatus.DROPPED,
];

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Statuses of every media item, ordered by the generated status_sort_order column. */
async function mediaItemStatusesBySortOrder() {
	const rows = await testDb
		.select({ status: mediaItems.status })
		.from(mediaItems)
		.orderBy(asc(mediaItems.statusSortOrder));

	return rows.map((row) => row.status);
}

/** Statuses of every series, ordered by the generated status_sort_order column. */
async function seriesStatusesBySortOrder() {
	const rows = await testDb
		.select({ status: series.status })
		.from(series)
		.orderBy(asc(series.statusSortOrder));

	return rows.map((row) => row.status);
}

// ---------------------------------------------------------------------------
// status_sort_order ranking
// ---------------------------------------------------------------------------

describe("media_items.status_sort_order", () => {
	it("ranks waiting_for_next_release directly after backlog", async () => {
		for (const status of ALL_STATUSES) {
			await insertMediaItem({
				userId: USER,
				type: MediaItemType.BOOK,
				title: status,
				status,
			});
		}

		expect(await mediaItemStatusesBySortOrder()).toEqual(EXPECTED_RANKING);
	});

	it("recomputes status_sort_order when a row's status changes", async () => {
		const itemId = await insertMediaItem({
			userId: USER,
			type: MediaItemType.BOOK,
			title: "Re-ranked",
			status: MediaItemStatus.IN_PROGRESS,
		});

		await testDb
			.update(mediaItems)
			.set({ status: MediaItemStatus.WAITING_FOR_NEXT_RELEASE })
			.where(eq(mediaItems.id, itemId));

		const [row] = await testDb
			.select({ sortOrder: mediaItems.statusSortOrder })
			.from(mediaItems)
			.where(eq(mediaItems.id, itemId));

		expect(row.sortOrder).toBe(1);
	});
});

describe("series.status_sort_order", () => {
	it("ranks waiting_for_next_release directly after backlog", async () => {
		for (const status of ALL_STATUSES) {
			await insertSeries({
				userId: USER,
				name: status,
				type: MediaItemType.BOOK,
				status,
			});
		}

		expect(await seriesStatusesBySortOrder()).toEqual(EXPECTED_RANKING);
	});
});
