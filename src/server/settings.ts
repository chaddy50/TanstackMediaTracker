import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import {
	type FilterAndSortOptions,
	type ItemSortField,
	type SeriesSortField,
	type SortDirection,
	type UserSettings,
	userSettings,
} from "#/db/schema";
import { getLoggedInUser } from "#/server/auth/session";
import type {
	BookConsumptionMethod,
	GameControlMethod,
	GamePlatform,
	MovieConsumptionMethod,
	TvShowConsumptionMethod,
} from "#/server/enums";

export const getUserSettings = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await getLoggedInUser();
		const rows = await db
			.select()
			.from(userSettings)
			.where(eq(userSettings.userId, user.id))
			.limit(1);
		return rows[0] ?? null;
	},
);

const updateUserSettingsInput = z.object({
	defaultLibrarySortBy: z.string().nullish(),
	defaultLibrarySortDirection: z.string().nullish(),
	defaultSeriesSortBy: z.string().nullish(),
	defaultSeriesSortDirection: z.string().nullish(),
	defaultBookConsumptionMethod: z.string().nullish(),
	defaultMovieConsumptionMethod: z.string().nullish(),
	defaultTvShowConsumptionMethod: z.string().nullish(),
	defaultGamePlatform: z.string().nullish(),
	defaultGameControlMethod: z.string().nullish(),
});

export const updateUserSettings = createServerFn({ method: "POST" })
	.inputValidator(updateUserSettingsInput)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		const values = {
			userId: user.id,
			defaultLibrarySortBy: (data.defaultLibrarySortBy ??
				null) as ItemSortField | null,
			defaultLibrarySortDirection: (data.defaultLibrarySortDirection ??
				null) as SortDirection | null,
			defaultSeriesSortBy: (data.defaultSeriesSortBy ??
				null) as SeriesSortField | null,
			defaultSeriesSortDirection: (data.defaultSeriesSortDirection ??
				null) as SortDirection | null,
			defaultBookConsumptionMethod: (data.defaultBookConsumptionMethod ??
				null) as BookConsumptionMethod | null,
			defaultMovieConsumptionMethod: (data.defaultMovieConsumptionMethod ??
				null) as MovieConsumptionMethod | null,
			defaultTvShowConsumptionMethod: (data.defaultTvShowConsumptionMethod ??
				null) as TvShowConsumptionMethod | null,
			defaultGamePlatform: (data.defaultGamePlatform ??
				null) as GamePlatform | null,
			defaultGameControlMethod: (data.defaultGameControlMethod ??
				null) as GameControlMethod | null,
		};
		await db
			.insert(userSettings)
			.values(values)
			.onConflictDoUpdate({
				target: userSettings.userId,
				set: {
					defaultLibrarySortBy: values.defaultLibrarySortBy,
					defaultLibrarySortDirection: values.defaultLibrarySortDirection,
					defaultSeriesSortBy: values.defaultSeriesSortBy,
					defaultSeriesSortDirection: values.defaultSeriesSortDirection,
					defaultBookConsumptionMethod: values.defaultBookConsumptionMethod,
					defaultMovieConsumptionMethod: values.defaultMovieConsumptionMethod,
					defaultTvShowConsumptionMethod: values.defaultTvShowConsumptionMethod,
					defaultGamePlatform: values.defaultGamePlatform,
					defaultGameControlMethod: values.defaultGameControlMethod,
				},
			});
	});

// ---- Private helpers

const DEFAULT_LIBRARY_SORT_BY: ItemSortField = "series";
const DEFAULT_SERIES_SORT_BY: SeriesSortField = "name";
const DEFAULT_SORT_DIRECTION: SortDirection = "asc";

export function applyLibrarySortDefaults(
	search: FilterAndSortOptions,
	settings: UserSettings | null,
): FilterAndSortOptions {
	return {
		sortBy: settings?.defaultLibrarySortBy ?? DEFAULT_LIBRARY_SORT_BY,
		sortDirection:
			settings?.defaultLibrarySortDirection ?? DEFAULT_SORT_DIRECTION,
		...search,
	};
}

export function applySeriesSortDefaults(
	search: FilterAndSortOptions,
	settings: UserSettings | null,
): FilterAndSortOptions {
	return {
		sortBy: settings?.defaultSeriesSortBy ?? DEFAULT_SERIES_SORT_BY,
		sortDirection:
			settings?.defaultSeriesSortDirection ?? DEFAULT_SORT_DIRECTION,
		...search,
	};
}
