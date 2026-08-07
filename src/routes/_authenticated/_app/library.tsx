import { createFileRoute } from "@tanstack/react-router";
import { LibraryScreen } from "#/features/screens/library/LibraryScreen";
import {
	getLibrary,
	getLibraryStats,
} from "#/features/screens/library/library";
import {
	applyLibrarySortDefaults,
	getUserSettings,
} from "#/features/screens/settings/settings";
import { filterAndSortOptionsSchema } from "#/lib/filterAndSort";

export const Route = createFileRoute("/_authenticated/_app/library")({
	validateSearch: filterAndSortOptionsSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => {
		const settings = await getUserSettings();
		const effectiveDeps = applyLibrarySortDefaults(deps, settings);
		const [data, stats] = await Promise.all([
			getLibrary({ data: effectiveDeps }),
			getLibraryStats({ data: effectiveDeps }),
		]);
		return { ...data, stats, settings };
	},
	component: LibraryScreen,
});
