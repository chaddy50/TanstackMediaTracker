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

import { eq } from "drizzle-orm";
import { creators, mediaItems } from "#/database/schema";
import { MediaItemType } from "#/lib/enums";
import { testDb } from "#/tests/integration/db";
import {
	insertCreator,
	insertMediaItem,
	truncateAll,
} from "#/tests/integration/helpers";
import { updateCreatorMetadata } from "../creatorDetails.server";

const USER_A = "user-a";
const USER_B = "user-b";

const SHARED_EXTERNAL = {
	externalId: "hc-123",
	externalSource: "hardcover",
} as const;

beforeEach(() => truncateAll());

async function readMetadata(itemId: number) {
	const [row] = await testDb
		.select({ metadata: mediaItems.metadata })
		.from(mediaItems)
		.where(eq(mediaItems.id, itemId));
	return row?.metadata as Record<string, unknown>;
}

describe("updateCreatorMetadata", () => {
	it("rewrites the author key on the caller's linked books", async () => {
		const creatorId = await insertCreator({
			userId: USER_A,
			name: "Old Name",
		});
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			creatorId,
			metadata: { author: "Old Name" },
		});

		await updateCreatorMetadata({ creatorId, name: "New Name" }, USER_A);

		expect((await readMetadata(itemId)).author).toBe("New Name");
	});

	it.each([
		[MediaItemType.BOOK, "author"],
		[MediaItemType.MOVIE, "director"],
		[MediaItemType.TV_SHOW, "creator"],
		[MediaItemType.PODCAST, "creator"],
		[MediaItemType.VIDEO_GAME, "developer"],
	])("propagates a rename into the %s '%s' key", async (type, key) => {
		const creatorId = await insertCreator({ userId: USER_A, name: "Old Name" });
		const itemId = await insertMediaItem({
			userId: USER_A,
			type,
			creatorId,
			metadata: { [key]: "Old Name" },
		});

		await updateCreatorMetadata({ creatorId, name: "New Name" }, USER_A);

		expect((await readMetadata(itemId))[key]).toBe("New Name");
	});

	it("leaves the other user's copy of the same external item untouched", async () => {
		const creatorA = await insertCreator({ userId: USER_A, name: "Old Name" });
		const itemA = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			creatorId: creatorA,
			metadata: { author: "Old Name" },
			...SHARED_EXTERNAL,
		});
		const itemB = await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.BOOK,
			metadata: { author: "Old Name" },
			...SHARED_EXTERNAL,
		});

		await updateCreatorMetadata(
			{ creatorId: creatorA, name: "New Name" },
			USER_A,
		);

		expect((await readMetadata(itemA)).author).toBe("New Name");
		expect((await readMetadata(itemB)).author).toBe("Old Name");
	});

	it("refuses a creator owned by another user", async () => {
		const creatorB = await insertCreator({
			userId: USER_B,
			name: "B's creator",
		});

		await expect(
			updateCreatorMetadata({ creatorId: creatorB, name: "Hijacked" }, USER_A),
		).rejects.toThrow(/not found/);

		const [row] = await testDb
			.select()
			.from(creators)
			.where(eq(creators.id, creatorB));
		expect(row?.name).toBe("B's creator");
	});

	it("writes no metadata when the name is unchanged", async () => {
		const creatorId = await insertCreator({
			userId: USER_A,
			name: "Same Name",
		});
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			creatorId,
			metadata: { author: "Stale value", other: "keep" },
		});

		await updateCreatorMetadata(
			{ creatorId, name: "Same Name", biography: "New bio" },
			USER_A,
		);

		// Only the creator row changes; the JSONB is left exactly as it was.
		expect(await readMetadata(itemId)).toEqual({
			author: "Stale value",
			other: "keep",
		});
		const [row] = await testDb
			.select()
			.from(creators)
			.where(eq(creators.id, creatorId));
		expect(row?.biography).toBe("New bio");
	});

	it("leaves sibling JSONB keys intact", async () => {
		const creatorId = await insertCreator({ userId: USER_A, name: "Old Name" });
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			creatorId,
			metadata: { director: "Old Name", runtime: 155, genres: ["scifi"] },
		});

		await updateCreatorMetadata({ creatorId, name: "New Name" }, USER_A);

		expect(await readMetadata(itemId)).toEqual({
			director: "New Name",
			runtime: 155,
			genres: ["scifi"],
		});
	});

	it("handles apostrophes and non-ASCII names", async () => {
		const creatorId = await insertCreator({ userId: USER_A, name: "Old" });
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			creatorId,
			metadata: { author: "Old" },
		});

		await updateCreatorMetadata(
			{ creatorId, name: "Patrick O'Brian — 宮崎 駿" },
			USER_A,
		);

		expect((await readMetadata(itemId)).author).toBe(
			"Patrick O'Brian — 宮崎 駿",
		);
	});

	// Documented pre-existing behavior: this call site uses a bare jsonb_set, so a
	// NULL metadata column stays NULL. Deliberately not fixed as part of the collapse.
	it("leaves a NULL metadata column NULL", async () => {
		const creatorId = await insertCreator({ userId: USER_A, name: "Old Name" });
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			creatorId,
		});
		await testDb
			.update(mediaItems)
			.set({ metadata: null })
			.where(eq(mediaItems.id, itemId));

		await updateCreatorMetadata({ creatorId, name: "New Name" }, USER_A);

		expect(await readMetadata(itemId)).toBeNull();
	});
});
