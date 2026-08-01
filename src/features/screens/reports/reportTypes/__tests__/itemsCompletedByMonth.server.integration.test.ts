import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemType } from "#/lib/enums";

vi.mock("#/database/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/features/screens/auth", () => ({ auth: {} }));
vi.mock("#/features/screens/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

import {
	insertInstance,
	insertMediaItem,
	truncateAll,
} from "#/tests/integration/helpers";
import { fetchItemsCompletedByMonth } from "../itemsCompletedByMonth.server";

const USER = "test-user";
const OTHER_USER = "other-user";
// The same external item held by both users — impossible under the old schema.
const SHARED_EXTERNAL = {
	externalId: "shared-external-1",
	externalSource: "test",
} as const;

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// date range
// ---------------------------------------------------------------------------

describe("date range", () => {
	it("excludes items completed before the cutoff", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,
		});
		// 4 months ago — outside a 3-month window
		await insertInstance({ mediaItemId: itemId, completedAt: "2023-11-10" });

		const result = await fetchItemsCompletedByMonth(
			USER,
			"2024-01-01",
			"2024-03-15",
		);

		expect(result.every((r) => r.value === 0)).toBe(true);
	});

	it("excludes future-dated items", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,
		});
		await insertInstance({ mediaItemId: itemId, completedAt: "2025-01-01" });

		const result = await fetchItemsCompletedByMonth(
			USER,
			"2024-01-01",
			"2024-03-15",
		);

		expect(result.every((r) => r.value === 0)).toBe(true);
	});

	it("includes items completed within the window", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,
		});
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });

		const result = await fetchItemsCompletedByMonth(
			USER,
			"2024-01-01",
			"2024-03-15",
		);

		expect(result.find((r) => r.month === "2024-03")?.value).toBe(1);
	});
});

describe("cross-user isolation", () => {
	it("excludes another user's item that shares the same external identity", async () => {
		const mine = await insertMediaItem({
			userId: USER,
			type: MediaItemType.BOOK,
			...SHARED_EXTERNAL,
		});
		const theirs = await insertMediaItem({
			userId: OTHER_USER,
			type: MediaItemType.BOOK,
			...SHARED_EXTERNAL,
		});
		await insertInstance({ mediaItemId: mine, completedAt: "2024-03-10" });
		await insertInstance({ mediaItemId: theirs, completedAt: "2024-03-10" });

		const result = await fetchItemsCompletedByMonth(
			USER,
			"2024-01-01",
			"2024-12-31",
		);
		const march = result.find((point) => point.month === "2024-03");

		expect(march?.value).toBe(1);
	});
});
