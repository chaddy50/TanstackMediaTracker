import { and, eq } from "drizzle-orm";

import { db } from "#/db/index";
import { creators } from "#/db/schema";

/**
 * Find an existing creator row for (userId, name), or create one with the
 * provided biography. Returns the creatorId.
 *
 * If the creator already exists with a null biography and a non-null biography
 * is provided, the row is updated so repeated backfill runs can fill in bios.
 *
 * This file uses the .server.ts convention — it must never be statically
 * imported by client-side code. Import it only from server function handler
 * bodies or other server-only modules.
 */
export async function findOrCreateCreator(
	name: string,
	userId: string,
	biography: string | null,
): Promise<number> {
	const [existing] = await db
		.select({ id: creators.id, biography: creators.biography })
		.from(creators)
		.where(and(eq(creators.userId, userId), eq(creators.name, name)));

	if (existing) {
		if (biography && !existing.biography) {
			await db
				.update(creators)
				.set({ biography })
				.where(eq(creators.id, existing.id));
		}
		return existing.id;
	}

	const [inserted] = await db
		.insert(creators)
		.values({ userId, name, biography })
		.returning({ id: creators.id });

	if (!inserted) {
		throw new Error(`Failed to create creator: ${name}`);
	}

	return inserted.id;
}
