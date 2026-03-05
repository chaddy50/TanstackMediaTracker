import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import { mediaItemTags, tags } from "#/db/schema";
import { getLoggedInUser } from "#/lib/session";

export const getTags = createServerFn({ method: "GET" }).handler(async () => {
	const user = await getLoggedInUser();
	return db
		.select()
		.from(tags)
		.where(eq(tags.userId, user.id))
		.orderBy(asc(tags.name));
});

export const saveMediaItemTags = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			mediaItemId: z.number().int(),
			tagNames: z.array(z.string().min(1)),
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		const { mediaItemId, tagNames } = data;

		// Upsert tag names for this user, then resolve their IDs
		if (tagNames.length > 0) {
			await db
				.insert(tags)
				.values(tagNames.map((name) => ({ userId: user.id, name })))
				.onConflictDoNothing();
		}

		const resolvedTagIds =
			tagNames.length > 0
				? await db
						.select({ id: tags.id })
						.from(tags)
						.where(
							and(eq(tags.userId, user.id), inArray(tags.name, tagNames)),
						)
						.then((rows) => rows.map((row) => row.id))
				: [];

		// Replace all tag associations for this media item
		await db
			.delete(mediaItemTags)
			.where(eq(mediaItemTags.mediaItemId, mediaItemId));

		if (resolvedTagIds.length > 0) {
			await db.insert(mediaItemTags).values(
				resolvedTagIds.map((tagId) => ({ mediaItemId, tagId })),
			);
		}
	});
