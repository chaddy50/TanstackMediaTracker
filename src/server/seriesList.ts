import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getLoggedInUser } from "#/lib/session";
import { querySeriesResults } from "#/server/itemQueries";
import { filterAndSortOptionsSchema } from "#/server/views";

export const getSeriesList = createServerFn({ method: "GET" })
	.inputValidator(filterAndSortOptionsSchema.extend({ offset: z.number().default(0) }))
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		const { offset, ...filters } = data;
		return querySeriesResults(filters, user.id, offset);
	});

export type SeriesListItem = Awaited<ReturnType<typeof getSeriesList>>["items"][number];
