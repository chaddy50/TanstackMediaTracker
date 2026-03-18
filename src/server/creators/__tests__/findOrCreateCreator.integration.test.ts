import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#/db/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/server/auth", () => ({ auth: {} }));

import { eq } from "drizzle-orm";

import { creators } from "#/db/schema";
import { testDb } from "#/tests/integration/db";
import { insertCreator, truncateAll } from "#/tests/integration/helpers";
import { findOrCreateCreator } from "../creators.server";

const USER = "test-user";

beforeEach(() => truncateAll());

describe("findOrCreateCreator", () => {
	it("inserts a new creator and returns its id when none exists", async () => {
		const creatorId = await findOrCreateCreator(
			"Frank Herbert",
			USER,
			"Born in 1920...",
		);

		const [row] = await testDb
			.select()
			.from(creators)
			.where(eq(creators.id, creatorId));

		expect(row?.name).toBe("Frank Herbert");
		expect(row?.biography).toBe("Born in 1920...");
		expect(row?.userId).toBe(USER);
	});

	it("returns the existing id without creating a duplicate when creator already exists", async () => {
		const existingId = await insertCreator({ userId: USER, name: "Frank Herbert" });

		const returnedId = await findOrCreateCreator("Frank Herbert", USER, null);

		expect(returnedId).toBe(existingId);

		const allRows = await testDb.select().from(creators);
		expect(allRows).toHaveLength(1);
	});

	it("backfills biography when creator exists with null biography and a new biography is provided", async () => {
		const existingId = await insertCreator({ userId: USER, name: "Frank Herbert" });

		await findOrCreateCreator("Frank Herbert", USER, "Born in 1920...");

		const [row] = await testDb
			.select({ biography: creators.biography })
			.from(creators)
			.where(eq(creators.id, existingId));

		expect(row?.biography).toBe("Born in 1920...");
	});

	it("does not overwrite an existing biography", async () => {
		const existingId = await insertCreator({ userId: USER, name: "Frank Herbert" });
		await testDb
			.update(creators)
			.set({ biography: "Original bio" })
			.where(eq(creators.id, existingId));

		await findOrCreateCreator("Frank Herbert", USER, "New bio");

		const [row] = await testDb
			.select({ biography: creators.biography })
			.from(creators)
			.where(eq(creators.id, existingId));

		expect(row?.biography).toBe("Original bio");
	});
});
