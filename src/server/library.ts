import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getLoggedInUser } from "#/lib/session";
import { queryItemResults } from "#/server/itemQueries";
import { filterAndSortOptionsSchema } from "#/server/views";

export const getLibrary = createServerFn({ method: "GET" })
	.inputValidator(filterAndSortOptionsSchema.extend({ offset: z.number().default(0) }))
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		const { offset, ...filters } = data;
		return queryItemResults(filters, user.id, offset);
	});

export type LibraryItem = Awaited<ReturnType<typeof getLibrary>>["items"][number];
