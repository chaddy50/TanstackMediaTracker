import { createServerFn } from "@tanstack/react-start";

import { getLoggedInUser } from "#/lib/session";
import { querySeriesResults } from "#/server/itemQueries";
import { viewFiltersSchema } from "#/server/views";

export const getSeriesList = createServerFn({ method: "GET" })
	.inputValidator(viewFiltersSchema)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return querySeriesResults(data, user.id);
	});

export type SeriesListItem = Awaited<ReturnType<typeof getSeriesList>>[number];
