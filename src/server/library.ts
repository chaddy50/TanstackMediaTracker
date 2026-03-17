import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getLoggedInUser } from "#/lib/session";
import { runItemQuery, transitionReleasedItems } from "#/server/mediaItemQueries";
import { filterAndSortOptionsSchema } from "#/server/views";

export const getLibrary = createServerFn({ method: "GET" })
	.inputValidator(filterAndSortOptionsSchema.extend({ offset: z.number().default(0) }))
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		await transitionReleasedItems(user.id);
		const { offset, ...filters } = data;
		return runItemQuery(filters, user.id, offset);
	});

export type LibraryItem = Awaited<ReturnType<typeof getLibrary>>["items"][number];
