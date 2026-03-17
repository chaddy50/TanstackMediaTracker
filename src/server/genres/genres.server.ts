import { and, eq } from "drizzle-orm";

import { db } from "#/db/index";
import { genres } from "#/db/schema";

/**
 * Find an existing genre row for (userId, name), or create one.
 * Returns the genreId.
 *
 * This file uses the .server.ts convention — it must never be statically
 * imported by client-side code. Import it only from server function handler
 * bodies or other server-only modules.
 */
export async function findOrCreateGenre(
	userId: string,
	name: string,
): Promise<number> {
	await db
		.insert(genres)
		.values({ userId, name })
		.onConflictDoNothing();

	const [row] = await db
		.select({ id: genres.id })
		.from(genres)
		.where(and(eq(genres.userId, userId), eq(genres.name, name)));

	if (!row) {
		throw new Error(`Failed to find or create genre "${name}"`);
	}

	return row.id;
}
