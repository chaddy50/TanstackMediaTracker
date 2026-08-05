import { asc, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemType } from "#/lib/enums";

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

import {
	type FilterAndSortOptions,
	mediaItems,
	mediaItemTags,
	type Tag,
	tags,
	views,
} from "#/database/schema";
import { testDb } from "#/tests/integration/db";
import {
	insertMediaItem,
	insertTag,
	insertView,
	linkTag,
	truncateAll,
} from "#/tests/integration/helpers";
import {
	createTag,
	deleteTag,
	getTagsWithUsage,
	renameTag,
} from "../tags.server";

const USER_A = "user-a";
const USER_B = "user-b";

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function insertItem(title: string, userId: string = USER_A) {
	return insertMediaItem({ userId, type: MediaItemType.BOOK, title });
}

async function readTagRows(userId: string): Promise<Tag[]> {
	return testDb
		.select()
		.from(tags)
		.where(eq(tags.userId, userId))
		.orderBy(asc(tags.name));
}

async function readTagRow(tagId: number): Promise<Tag | undefined> {
	const [row] = await testDb.select().from(tags).where(eq(tags.id, tagId));
	return row;
}

async function readLinkedItemIds(tagId: number): Promise<number[]> {
	const rows = await testDb
		.select({ mediaItemId: mediaItemTags.mediaItemId })
		.from(mediaItemTags)
		.where(eq(mediaItemTags.tagId, tagId))
		.orderBy(asc(mediaItemTags.mediaItemId));

	return rows.map((row) => row.mediaItemId);
}

async function readViewFilters(viewId: number): Promise<FilterAndSortOptions> {
	const [row] = await testDb
		.select({ filters: views.filters })
		.from(views)
		.where(eq(views.id, viewId));

	if (!row) throw new Error(`View ${viewId} not found`);
	return row.filters;
}

async function readViewFilterTags(
	viewId: number,
): Promise<string[] | undefined> {
	return (await readViewFilters(viewId)).tags;
}

/** Names with usage counts — the shape the assertions actually care about. */
async function readUsage(userId: string) {
	const rows = await getTagsWithUsage(userId);
	return rows.map((row) => ({ name: row.name, itemCount: row.itemCount }));
}

// ---------------------------------------------------------------------------
// getTagsWithUsage
// ---------------------------------------------------------------------------

describe("getTagsWithUsage", () => {
	it("returns the caller's tags with usage counts, ordered by name", async () => {
		const horrorId = await insertTag({ userId: USER_A, name: "Horror" });
		const sciFiId = await insertTag({ userId: USER_A, name: "Sci-Fi" });
		const firstItemId = await insertItem("First");
		const secondItemId = await insertItem("Second");
		await linkTag(firstItemId, horrorId);
		await linkTag(secondItemId, horrorId);
		await linkTag(firstItemId, sciFiId);

		expect(await readUsage(USER_A)).toEqual([
			{ name: "Horror", itemCount: 2 },
			{ name: "Sci-Fi", itemCount: 1 },
		]);
	});

	it("returns an unused tag with a count of zero", async () => {
		await insertTag({ userId: USER_A, name: "Sci-Fi" });

		expect(await readUsage(USER_A)).toEqual([{ name: "Sci-Fi", itemCount: 0 }]);
	});

	it("excludes another user's tags", async () => {
		await insertTag({ userId: USER_A, name: "Horror" });
		await insertTag({ userId: USER_B, name: "Sci-Fi" });

		expect(await readUsage(USER_A)).toEqual([{ name: "Horror", itemCount: 0 }]);
	});

	it("does not count another user's links against a same-named tag", async () => {
		const ownTagId = await insertTag({ userId: USER_A, name: "Sci-Fi" });
		const otherTagId = await insertTag({ userId: USER_B, name: "Sci-Fi" });
		const ownItemId = await insertItem("Mine");
		const otherFirstItemId = await insertItem("Theirs", USER_B);
		const otherSecondItemId = await insertItem("Theirs Too", USER_B);
		await linkTag(ownItemId, ownTagId);
		await linkTag(otherFirstItemId, otherTagId);
		await linkTag(otherSecondItemId, otherTagId);

		expect(await readUsage(USER_A)).toEqual([{ name: "Sci-Fi", itemCount: 1 }]);
	});

	it("returns an empty list for a user with no tags", async () => {
		await insertTag({ userId: USER_B, name: "Sci-Fi" });

		expect(await getTagsWithUsage(USER_A)).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// renameTag
// ---------------------------------------------------------------------------

describe("renameTag", () => {
	it("renames the caller's tag", async () => {
		const tagId = await insertTag({ userId: USER_A, name: "Sci-Fi" });

		expect(await renameTag(tagId, "Space Opera", USER_A)).toEqual({
			status: "ok",
		});
		expect((await readTagRow(tagId))?.name).toBe("Space Opera");
	});

	it("trims surrounding whitespace from the new name", async () => {
		const tagId = await insertTag({ userId: USER_A, name: "Sci-Fi" });

		expect(await renameTag(tagId, "  Space Opera  ", USER_A)).toEqual({
			status: "ok",
		});
		expect((await readTagRow(tagId))?.name).toBe("Space Opera");
	});

	it("reports a name the caller already owns as a conflict", async () => {
		const sciFiId = await insertTag({ userId: USER_A, name: "Sci-Fi" });
		const horrorId = await insertTag({ userId: USER_A, name: "Horror" });
		const viewId = await insertView({
			userId: USER_A,
			filters: { tags: ["Sci-Fi", "Horror"] },
		});

		expect(await renameTag(sciFiId, "Horror", USER_A)).toEqual({
			status: "conflict",
		});

		expect((await readTagRow(sciFiId))?.name).toBe("Sci-Fi");
		expect((await readTagRow(horrorId))?.name).toBe("Horror");
		expect(await readViewFilterTags(viewId)).toEqual(["Sci-Fi", "Horror"]);
	});

	it("does not treat a name owned only by another user as a conflict", async () => {
		const tagId = await insertTag({ userId: USER_A, name: "Sci-Fi" });
		await insertTag({ userId: USER_B, name: "Space Opera" });

		expect(await renameTag(tagId, "Space Opera", USER_A)).toEqual({
			status: "ok",
		});
		expect((await readTagRow(tagId))?.name).toBe("Space Opera");
	});

	it("does not treat a tag's own current name as a conflict", async () => {
		const tagId = await insertTag({ userId: USER_A, name: "Sci-Fi" });

		expect(await renameTag(tagId, "Sci-Fi", USER_A)).toEqual({ status: "ok" });
		expect((await readTagRow(tagId))?.name).toBe("Sci-Fi");
	});

	it("rejects a tag owned by another user and changes nothing", async () => {
		const tagId = await insertTag({ userId: USER_B, name: "Sci-Fi" });
		const viewId = await insertView({
			userId: USER_B,
			filters: { tags: ["Sci-Fi"] },
		});

		await expect(renameTag(tagId, "Space Opera", USER_A)).rejects.toThrow(
			`Tag ${tagId} not found`,
		);

		expect((await readTagRow(tagId))?.name).toBe("Sci-Fi");
		expect(await readViewFilterTags(viewId)).toEqual(["Sci-Fi"]);
	});

	it("rewrites the old name inside the caller's saved view filters", async () => {
		const tagId = await insertTag({ userId: USER_A, name: "Sci-Fi" });
		await insertTag({ userId: USER_A, name: "Horror" });
		const viewId = await insertView({
			userId: USER_A,
			filters: { tags: ["Sci-Fi", "Horror"] },
		});

		await renameTag(tagId, "Space Opera", USER_A);

		expect(await readViewFilterTags(viewId)).toEqual(["Space Opera", "Horror"]);
	});

	it("rejects a whitespace-only name and changes nothing", async () => {
		const tagId = await insertTag({ userId: USER_A, name: "Sci-Fi" });
		const viewId = await insertView({
			userId: USER_A,
			filters: { tags: ["Sci-Fi"] },
		});

		await expect(renameTag(tagId, "   ", USER_A)).rejects.toThrow();

		expect((await readTagRow(tagId))?.name).toBe("Sci-Fi");
		expect(await readViewFilterTags(viewId)).toEqual(["Sci-Fi"]);
	});
});

// ---------------------------------------------------------------------------
// deleteTag
// ---------------------------------------------------------------------------

describe("deleteTag", () => {
	it("deletes the caller's tag row", async () => {
		const tagId = await insertTag({ userId: USER_A, name: "Sci-Fi" });

		await deleteTag(tagId, USER_A);

		expect(await readTagRow(tagId)).toBeUndefined();
	});

	it("cascades the junction rows away while the items survive", async () => {
		const tagId = await insertTag({ userId: USER_A, name: "Sci-Fi" });
		const firstItemId = await insertItem("First");
		const secondItemId = await insertItem("Second");
		await linkTag(firstItemId, tagId);
		await linkTag(secondItemId, tagId);

		await deleteTag(tagId, USER_A);

		expect(await readLinkedItemIds(tagId)).toEqual([]);
		const remainingItemIds = (
			await testDb
				.select({ id: mediaItems.id })
				.from(mediaItems)
				.orderBy(asc(mediaItems.id))
		).map((row) => row.id);
		expect(remainingItemIds).toEqual([firstItemId, secondItemId]);
	});

	it("deletes an unused tag without touching other tags' links", async () => {
		const unusedTagId = await insertTag({ userId: USER_A, name: "Sci-Fi" });
		const usedTagId = await insertTag({ userId: USER_A, name: "Horror" });
		const itemId = await insertItem("First");
		await linkTag(itemId, usedTagId);

		await deleteTag(unusedTagId, USER_A);

		expect(await readTagRow(unusedTagId)).toBeUndefined();
		expect(await readLinkedItemIds(usedTagId)).toEqual([itemId]);
	});

	it("rejects a tag owned by another user and changes nothing", async () => {
		const tagId = await insertTag({ userId: USER_B, name: "Sci-Fi" });
		const itemId = await insertItem("Theirs", USER_B);
		await linkTag(itemId, tagId);

		await expect(deleteTag(tagId, USER_A)).rejects.toThrow(
			`Tag ${tagId} not found`,
		);

		expect((await readTagRow(tagId))?.name).toBe("Sci-Fi");
		expect(await readLinkedItemIds(tagId)).toEqual([itemId]);
	});

	it("strips the name from the caller's saved view filters", async () => {
		const tagId = await insertTag({ userId: USER_A, name: "Sci-Fi" });
		await insertTag({ userId: USER_A, name: "Horror" });
		const viewId = await insertView({
			userId: USER_A,
			filters: {
				mediaTypes: [MediaItemType.BOOK],
				sortBy: "title",
				tags: ["Sci-Fi", "Horror"],
			},
		});

		await deleteTag(tagId, USER_A);

		expect(await readViewFilters(viewId)).toEqual({
			mediaTypes: [MediaItemType.BOOK],
			sortBy: "title",
			tags: ["Horror"],
		});
	});

	it("drops the deleted tag out of the usage list", async () => {
		const tagId = await insertTag({ userId: USER_A, name: "Sci-Fi" });
		await insertTag({ userId: USER_A, name: "Horror" });

		await deleteTag(tagId, USER_A);

		expect(await readUsage(USER_A)).toEqual([{ name: "Horror", itemCount: 0 }]);
	});
});

// ---------------------------------------------------------------------------
// createTag
// ---------------------------------------------------------------------------

describe("createTag", () => {
	it("creates the tag for the caller", async () => {
		expect(await createTag("Sci-Fi", USER_A)).toEqual({ status: "ok" });

		expect(await readUsage(USER_A)).toEqual([{ name: "Sci-Fi", itemCount: 0 }]);
	});

	it("trims surrounding whitespace from the name", async () => {
		expect(await createTag("  Space Opera  ", USER_A)).toEqual({
			status: "ok",
		});

		expect((await readTagRows(USER_A)).map((row) => row.name)).toEqual([
			"Space Opera",
		]);
	});

	it("reports a name the caller already owns as a conflict", async () => {
		await insertTag({ userId: USER_A, name: "Sci-Fi" });

		expect(await createTag("Sci-Fi", USER_A)).toEqual({ status: "conflict" });

		expect((await readTagRows(USER_A)).map((row) => row.name)).toEqual([
			"Sci-Fi",
		]);
	});

	it("does not treat a name owned only by another user as a conflict", async () => {
		const otherTagId = await insertTag({ userId: USER_B, name: "Sci-Fi" });

		expect(await createTag("Sci-Fi", USER_A)).toEqual({ status: "ok" });

		const ownTagRows = await readTagRows(USER_A);
		expect(ownTagRows.map((row) => row.name)).toEqual(["Sci-Fi"]);
		expect(ownTagRows[0]?.id).not.toBe(otherTagId);
	});

	it("does not treat a differently cased name as a conflict", async () => {
		await insertTag({ userId: USER_A, name: "Sci-Fi" });

		expect(await createTag("sci-fi", USER_A)).toEqual({ status: "ok" });

		expect((await readTagRows(USER_A)).map((row) => row.name).sort()).toEqual([
			"Sci-Fi",
			"sci-fi",
		]);
	});

	it("rejects a whitespace-only name", async () => {
		await expect(createTag("   ", USER_A)).rejects.toThrow(
			"Taxonomy name cannot be empty",
		);

		expect(await readTagRows(USER_A)).toEqual([]);
	});
});
