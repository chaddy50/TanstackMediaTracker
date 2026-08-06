import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/database/index";
import { genres, mediaItems } from "#/database/schema";
import { getLoggedInUser } from "#/features/screens/auth/session";
import {
	createGenre as createGenreInDatabase,
	deleteGenre as deleteGenreInDatabase,
	fetchGenreDetails,
	findOrCreateGenre,
	getGenresWithUsage as getGenresWithUsageFromDatabase,
	mergeGenres as mergeGenresInDatabase,
	renameGenre as renameGenreInDatabase,
} from "#/lib/genres/genres.server";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const createGenreInputSchema = z.object({
	name: z.string().trim().min(1),
});

export const renameGenreInputSchema = z.object({
	genreId: z.number().int(),
	name: z.string().trim().min(1),
});

export const deleteGenreInputSchema = z.object({
	genreId: z.number().int(),
});

/**
 * Equal ids are not rejected here — `mergeGenres` owns that guard, so the
 * condition has exactly one error path.
 */
export const mergeGenresInputSchema = z.object({
	sourceGenreId: z.number().int(),
	targetGenreId: z.number().int(),
});

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const getGenres = createServerFn({ method: "GET" }).handler(async () => {
	const user = await getLoggedInUser();
	return db
		.select({ id: genres.id, name: genres.name })
		.from(genres)
		.where(eq(genres.userId, user.id))
		.orderBy(asc(genres.name));
});

export const saveMediaItemGenre = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			mediaItemId: z.number().int(),
			genreName: z.string().min(1).nullable(),
		}),
	)
	.handler(async ({ data: { mediaItemId, genreName } }) => {
		const user = await getLoggedInUser();

		let genreId: number | null = null;
		if (genreName !== null) {
			genreId = await findOrCreateGenre(user.id, genreName);
		}

		await db
			.update(mediaItems)
			.set({ genreId })
			.where(
				and(eq(mediaItems.id, mediaItemId), eq(mediaItems.userId, user.id)),
			);
	});

export const getGenreDetails = createServerFn({ method: "GET" })
	.inputValidator(z.object({ id: z.number() }))
	.handler(async ({ data: { id } }) => {
		const user = await getLoggedInUser();
		return fetchGenreDetails(id, user.id);
	});

export type GenreDetails = Awaited<ReturnType<typeof getGenreDetails>>;
export type GenreItem = GenreDetails["items"][number];

export const getGenresWithUsage = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await getLoggedInUser();
		return getGenresWithUsageFromDatabase(user.id);
	},
);

export const createGenre = createServerFn({ method: "POST" })
	.inputValidator(createGenreInputSchema)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return createGenreInDatabase(data.name, user.id);
	});

export const renameGenre = createServerFn({ method: "POST" })
	.inputValidator(renameGenreInputSchema)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return renameGenreInDatabase(data.genreId, data.name, user.id);
	});

export const deleteGenre = createServerFn({ method: "POST" })
	.inputValidator(deleteGenreInputSchema)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		await deleteGenreInDatabase(data.genreId, user.id);
	});

export const mergeGenres = createServerFn({ method: "POST" })
	.inputValidator(mergeGenresInputSchema)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		await mergeGenresInDatabase(
			data.sourceGenreId,
			data.targetGenreId,
			user.id,
		);
	});
