import { and, eq } from "drizzle-orm";

import { db } from "#/db/index";
import { genres } from "#/db/schema";

// ---------------------------------------------------------------------------
// Internal helpers — not server functions, never imported from client code
// ---------------------------------------------------------------------------

/**
 * Find an existing genre row for (userId, name), or create one.
 * Returns the genreId.
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
