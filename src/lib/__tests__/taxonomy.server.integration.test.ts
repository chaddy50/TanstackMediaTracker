import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemStatus, MediaItemType } from "#/lib/enums";

// Redirect all db calls to the test database.
// vi.mock is hoisted before imports, so the handlers will see testDb.
vi.mock("#/database/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/features/screens/auth", () => ({ auth: {} }));
vi.mock("#/features/screens/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

import { type FilterAndSortOptions, views } from "#/database/schema";
import { testDb } from "#/tests/integration/db";
import { insertView, truncateAll } from "#/tests/integration/helpers";
import {
	removeValueFromViewFilters,
	renameValueInViewFilters,
} from "../taxonomy.server";

const USER_A = "user-a";
const USER_B = "user-b";

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readViewFilters(viewId: number): Promise<FilterAndSortOptions> {
	const [row] = await testDb
		.select({ filters: views.filters })
		.from(views)
		.where(eq(views.id, viewId));

	if (!row) throw new Error(`View ${viewId} not found`);
	return row.filters;
}

// ---------------------------------------------------------------------------
// The rewriters, run once per taxonomy filter key
// ---------------------------------------------------------------------------

/**
 * Running the whole table against both keys is what proves these helpers are
 * genuinely parameterized rather than tags-with-a-parameter.
 */
describe.each(["tags", "genres"] as const)("%s view filters", (filterKey) => {
	const siblingKey = filterKey === "tags" ? "genres" : "tags";

	describe("renameValueInViewFilters", () => {
		it("rewrites the old name across every view carrying the key", async () => {
			const firstViewId = await insertView({
				userId: USER_A,
				name: "First",
				filters: { [filterKey]: ["Sci-Fi"] },
			});
			const secondViewId = await insertView({
				userId: USER_A,
				name: "Second",
				filters: { [filterKey]: ["Sci-Fi"] },
			});

			await renameValueInViewFilters(
				USER_A,
				filterKey,
				"Sci-Fi",
				"Space Opera",
			);

			expect((await readViewFilters(firstViewId))[filterKey]).toEqual([
				"Space Opera",
			]);
			expect((await readViewFilters(secondViewId))[filterKey]).toEqual([
				"Space Opera",
			]);
		});

		it("leaves unrelated filter keys intact, including the other taxonomy key", async () => {
			const viewId = await insertView({
				userId: USER_A,
				filters: {
					mediaTypes: [MediaItemType.BOOK],
					statuses: [MediaItemStatus.BACKLOG],
					sortBy: "title",
					sortDirection: "asc",
					[filterKey]: ["Sci-Fi"],
					[siblingKey]: ["Sci-Fi", "Horror"],
				},
			});

			await renameValueInViewFilters(
				USER_A,
				filterKey,
				"Sci-Fi",
				"Space Opera",
			);

			expect(await readViewFilters(viewId)).toEqual({
				mediaTypes: [MediaItemType.BOOK],
				statuses: [MediaItemStatus.BACKLOG],
				sortBy: "title",
				sortDirection: "asc",
				[filterKey]: ["Space Opera"],
				[siblingKey]: ["Sci-Fi", "Horror"],
			});
		});

		it("leaves views without the key, with a different name, or with empty filters untouched", async () => {
			const otherNameViewId = await insertView({
				userId: USER_A,
				name: "Other Name",
				filters: { [filterKey]: ["Horror"] },
			});
			const noKeyViewId = await insertView({
				userId: USER_A,
				name: "No Key",
				filters: { statuses: [MediaItemStatus.BACKLOG] },
			});
			const emptyFiltersViewId = await insertView({
				userId: USER_A,
				name: "Empty Filters",
				filters: {},
			});

			await renameValueInViewFilters(
				USER_A,
				filterKey,
				"Sci-Fi",
				"Space Opera",
			);

			expect(await readViewFilters(otherNameViewId)).toEqual({
				[filterKey]: ["Horror"],
			});
			expect(await readViewFilters(noKeyViewId)).toEqual({
				statuses: [MediaItemStatus.BACKLOG],
			});
			expect(await readViewFilters(emptyFiltersViewId)).toEqual({});
		});

		it("does not touch another user's views listing the same name", async () => {
			const otherViewId = await insertView({
				userId: USER_B,
				filters: { [filterKey]: ["Sci-Fi"] },
			});

			await renameValueInViewFilters(
				USER_A,
				filterKey,
				"Sci-Fi",
				"Space Opera",
			);

			expect((await readViewFilters(otherViewId))[filterKey]).toEqual([
				"Sci-Fi",
			]);
		});

		it("does not duplicate a name a view already lists", async () => {
			const viewId = await insertView({
				userId: USER_A,
				filters: { [filterKey]: ["Space Opera", "Sci-Fi", "Horror"] },
			});

			await renameValueInViewFilters(
				USER_A,
				filterKey,
				"Sci-Fi",
				"Space Opera",
			);

			expect((await readViewFilters(viewId))[filterKey]).toEqual([
				"Space Opera",
				"Horror",
			]);
		});

		it("is a no-op when no view carries the old name", async () => {
			const otherNameViewId = await insertView({
				userId: USER_A,
				name: "Other Name",
				filters: { [filterKey]: ["Horror"] },
			});
			const siblingViewId = await insertView({
				userId: USER_A,
				name: "Sibling Key",
				filters: { [siblingKey]: ["Sci-Fi"] },
			});

			await renameValueInViewFilters(
				USER_A,
				filterKey,
				"Sci-Fi",
				"Space Opera",
			);

			expect(await readViewFilters(otherNameViewId)).toEqual({
				[filterKey]: ["Horror"],
			});
			expect(await readViewFilters(siblingViewId)).toEqual({
				[siblingKey]: ["Sci-Fi"],
			});
		});

		it("is case-sensitive", async () => {
			const viewId = await insertView({
				userId: USER_A,
				filters: { [filterKey]: ["sci-fi"] },
			});

			await renameValueInViewFilters(
				USER_A,
				filterKey,
				"Sci-Fi",
				"Space Opera",
			);

			expect((await readViewFilters(viewId))[filterKey]).toEqual(["sci-fi"]);
		});
	});

	describe("removeValueFromViewFilters", () => {
		it("strips the name from the key's list and leaves the rest", async () => {
			const viewId = await insertView({
				userId: USER_A,
				filters: {
					mediaTypes: [MediaItemType.BOOK],
					[filterKey]: ["Sci-Fi", "Horror"],
				},
			});

			await removeValueFromViewFilters(USER_A, filterKey, "Sci-Fi");

			expect(await readViewFilters(viewId)).toEqual({
				mediaTypes: [MediaItemType.BOOK],
				[filterKey]: ["Horror"],
			});
		});

		it("drops the key entirely when the list empties", async () => {
			const viewId = await insertView({
				userId: USER_A,
				filters: {
					statuses: [MediaItemStatus.BACKLOG],
					[filterKey]: ["Sci-Fi"],
				},
			});

			await removeValueFromViewFilters(USER_A, filterKey, "Sci-Fi");

			const filters = await readViewFilters(viewId);
			expect(filters).toEqual({ statuses: [MediaItemStatus.BACKLOG] });
			// An emptied list must not survive as `[]`.
			expect(filterKey in filters).toBe(false);
		});

		it("leaves the sibling taxonomy key and other names intact", async () => {
			const viewId = await insertView({
				userId: USER_A,
				filters: {
					[filterKey]: ["Sci-Fi", "Horror"],
					[siblingKey]: ["Sci-Fi"],
				},
			});

			await removeValueFromViewFilters(USER_A, filterKey, "Sci-Fi");

			expect(await readViewFilters(viewId)).toEqual({
				[filterKey]: ["Horror"],
				[siblingKey]: ["Sci-Fi"],
			});
		});

		it("does not touch another user's views", async () => {
			const otherViewId = await insertView({
				userId: USER_B,
				filters: { [filterKey]: ["Sci-Fi"] },
			});

			await removeValueFromViewFilters(USER_A, filterKey, "Sci-Fi");

			expect((await readViewFilters(otherViewId))[filterKey]).toEqual([
				"Sci-Fi",
			]);
		});

		it("is a no-op for a name no view lists", async () => {
			const otherNameViewId = await insertView({
				userId: USER_A,
				name: "Other Name",
				filters: { [filterKey]: ["Horror"] },
			});
			const siblingViewId = await insertView({
				userId: USER_A,
				name: "Sibling Key",
				filters: { [siblingKey]: ["Sci-Fi"] },
			});
			const emptyFiltersViewId = await insertView({
				userId: USER_A,
				name: "Empty Filters",
				filters: {},
			});

			await removeValueFromViewFilters(USER_A, filterKey, "Sci-Fi");

			expect(await readViewFilters(otherNameViewId)).toEqual({
				[filterKey]: ["Horror"],
			});
			expect(await readViewFilters(siblingViewId)).toEqual({
				[siblingKey]: ["Sci-Fi"],
			});
			expect(await readViewFilters(emptyFiltersViewId)).toEqual({});
		});
	});
});
