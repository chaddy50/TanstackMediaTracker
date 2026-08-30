import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getLoggedInUser } from "#/features/screens/auth/session";
import { filterAndSortOptionsSchema } from "#/lib/filterAndSort";
import { runSeriesQuery } from "#/lib/queries/seriesQuery.server";
import { MAX_QUERY_LIMIT } from "#/lib/queries/types";

export const getSeriesList = createServerFn({ method: "GET" })
	.inputValidator(
		filterAndSortOptionsSchema.extend({
			offset: z.number().default(0),
			limit: z.number().int().min(1).max(MAX_QUERY_LIMIT).optional(),
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		const { offset, limit, ...filters } = data;
		return runSeriesQuery(filters, user.id, offset, limit);
	});

export type SeriesListItem = Awaited<
	ReturnType<typeof getSeriesList>
>["items"][number];
