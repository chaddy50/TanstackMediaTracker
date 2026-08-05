import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Tag } from "#/database/schema";
import { getLoggedInUser } from "#/features/screens/auth/session";
import {
	createTag as createTagInDatabase,
	deleteTag as deleteTagInDatabase,
	fetchTags,
	getTagsWithUsage as getTagsWithUsageFromDatabase,
	renameTag as renameTagInDatabase,
	saveMediaItemTags as saveMediaItemTagsInDatabase,
} from "#/lib/tags.server";

/**
 * A tag paired with how many of the user's items carry it. Declared here rather
 * than in `tags.server.ts` so components can name the type without importing a
 * `.server` module.
 */
export type TagWithUsageCount = Tag & { itemCount: number };

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const createTagInputSchema = z.object({
	name: z.string().trim().min(1),
});

export const renameTagInputSchema = z.object({
	tagId: z.number().int(),
	name: z.string().trim().min(1),
});

export const deleteTagInputSchema = z.object({
	tagId: z.number().int(),
});

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export const getTags = createServerFn({ method: "GET" }).handler(async () => {
	const user = await getLoggedInUser();
	return fetchTags(user.id);
});

export const getTagsWithUsage = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await getLoggedInUser();
		return getTagsWithUsageFromDatabase(user.id);
	},
);

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export const saveMediaItemTags = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			mediaItemId: z.number().int(),
			tagNames: z.array(z.string().min(1)),
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		await saveMediaItemTagsInDatabase(data.mediaItemId, data.tagNames, user.id);
	});

export const createTag = createServerFn({ method: "POST" })
	.inputValidator(createTagInputSchema)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return createTagInDatabase(data.name, user.id);
	});

export const renameTag = createServerFn({ method: "POST" })
	.inputValidator(renameTagInputSchema)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return renameTagInDatabase(data.tagId, data.name, user.id);
	});

export const deleteTag = createServerFn({ method: "POST" })
	.inputValidator(deleteTagInputSchema)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		await deleteTagInDatabase(data.tagId, user.id);
	});
