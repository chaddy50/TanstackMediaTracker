import { createServerFn } from "@tanstack/react-start";

import { getLoggedInUser } from "#/lib/session";
import { queryItemResults } from "#/server/itemQueries";
import { viewFiltersSchema } from "#/server/views";

export const getLibrary = createServerFn({ method: "GET" })
	.inputValidator(viewFiltersSchema)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return queryItemResults(data, user.id);
	});

export type LibraryItem = Awaited<ReturnType<typeof getLibrary>>[number];
