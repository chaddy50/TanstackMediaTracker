import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getLoggedInUser } from "#/features/screens/auth/session";
import { filterAndSortOptionsSchema } from "#/lib/filterAndSort";
import {
	runItemQuery,
	runItemStatsQuery,
	transitionReleasedItems,
} from "#/lib/queries/itemQuery.server";

export const getLibrary = createServerFn({ method: "GET" })
	.inputValidator(
		filterAndSortOptionsSchema.extend({ offset: z.number().default(0) }),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		await transitionReleasedItems(user.id);
		const { offset, ...filters } = data;
		return runItemQuery(filters, user.id, offset);
	});

export type LibraryItem = Awaited<
	ReturnType<typeof getLibrary>
>["items"][number];

export const getLibraryStats = createServerFn({ method: "GET" })
	.inputValidator(filterAndSortOptionsSchema)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return runItemStatsQuery(data, user.id);
	});
