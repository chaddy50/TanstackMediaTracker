import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getLoggedInUser } from "#/features/screens/auth/session";
import { filterAndSortOptionsSchema } from "#/lib/filterAndSort";
import { runSeriesQuery } from "#/lib/queries/seriesQuery.server";

export const getSeriesList = createServerFn({ method: "GET" })
	.inputValidator(
		filterAndSortOptionsSchema.extend({ offset: z.number().default(0) }),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		const { offset, ...filters } = data;
		return runSeriesQuery(filters, user.id, offset);
	});

export type SeriesListItem = Awaited<
	ReturnType<typeof getSeriesList>
>["items"][number];
