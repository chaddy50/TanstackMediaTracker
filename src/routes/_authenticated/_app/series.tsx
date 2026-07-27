import { createFileRoute } from "@tanstack/react-router";
import { SeriesScreen } from "#/features/screens/series/SeriesScreen";
import { getSeriesList } from "#/features/screens/series/series";
import {
	applySeriesSortDefaults,
	getUserSettings,
} from "#/features/screens/settings/settings";
import { filterAndSortOptionsSchema } from "#/lib/filterAndSort";

export const Route = createFileRoute("/_authenticated/_app/series")({
	validateSearch: filterAndSortOptionsSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => {
		const settings = await getUserSettings();
		const effectiveDeps = applySeriesSortDefaults(deps, settings);
		const data = await getSeriesList({ data: effectiveDeps });
		return { ...data, settings };
	},
	component: SeriesScreen,
});
