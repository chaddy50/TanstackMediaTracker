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
	insertInstance,
	insertMediaItem,
	insertMetadata,
	truncateAll,
} from "#/tests/integration/helpers";
import { fetchItemsCompletedByMonth } from "../itemsCompletedByMonth.server";

const USER = "test-user";

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// date range
// ---------------------------------------------------------------------------

describe("date range", () => {
	it("excludes items completed before the cutoff", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const itemId = await insertMediaItem({ userId: USER, metadataId });
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
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const itemId = await insertMediaItem({ userId: USER, metadataId });
		await insertInstance({ mediaItemId: itemId, completedAt: "2025-01-01" });

		const result = await fetchItemsCompletedByMonth(
			USER,
			"2024-01-01",
			"2024-03-15",
		);

		expect(result.every((r) => r.value === 0)).toBe(true);
	});

	it("includes items completed within the window", async () => {
		const metadataId = await insertMetadata({ type: MediaItemType.BOOK });
		const itemId = await insertMediaItem({ userId: USER, metadataId });
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });

		const result = await fetchItemsCompletedByMonth(
			USER,
			"2024-01-01",
			"2024-03-15",
		);

		expect(result.find((r) => r.month === "2024-03")?.value).toBe(1);
	});
});
