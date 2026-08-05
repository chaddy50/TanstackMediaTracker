import {
	createGenre,
	deleteGenre,
	getGenresWithUsage,
	renameGenre,
} from "#/lib/genres/genres";
import { TaxonomySection } from "./taxonomy/TaxonomySection";
import type { TaxonomySectionConfig } from "./taxonomy/types";

export function GenresSection() {
	return <TaxonomySection config={GENRES_CONFIG} />;
}

const GENRES_CONFIG: TaxonomySectionConfig = {
	i18nPrefix: "settings.genres",
	listQueryKey: ["genresWithUsage"],
	// "genres" feeds both filter forms; "views" may have been rewritten.
	dependentQueryKeys: [["genres"], ["views"]],
	listEntries: () => getGenresWithUsage(),
	createEntry: (name) => createGenre({ data: { name } }),
	renameEntry: (entryId, name) =>
		renameGenre({ data: { genreId: entryId, name } }),
	deleteEntry: async (entryId) => {
		await deleteGenre({ data: { genreId: entryId } });
	},
};
