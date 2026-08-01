import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/database/index";
import { genres, mediaItems } from "#/database/schema";
import { getLoggedInUser } from "#/features/screens/auth/session";
import {
	fetchGenreDetails,
	findOrCreateGenre,
} from "#/lib/genres/genres.server";

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
