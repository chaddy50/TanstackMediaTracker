import { createTag, deleteTag, getTagsWithUsage, renameTag } from "#/lib/tags";
import { TaxonomySection } from "./taxonomy/TaxonomySection";
import type { TaxonomySectionConfig } from "./taxonomy/types";

export function TagsSection() {
	return <TaxonomySection config={TAGS_CONFIG} />;
}

const TAGS_CONFIG: TaxonomySectionConfig = {
	i18nPrefix: "settings.tags",
	listQueryKey: ["tagsWithUsage"],
	// "tags" feeds TagsEditor and both filter forms; "views" may have been rewritten.
	dependentQueryKeys: [["tags"], ["views"]],
	listEntries: async () => {
		const tagList = await getTagsWithUsage();
		return tagList.map((tag) => ({
			id: tag.id,
			name: tag.name,
			itemCount: tag.itemCount,
		}));
	},
	createEntry: (name) => createTag({ data: { name } }),
	renameEntry: (entryId, name) => renameTag({ data: { tagId: entryId, name } }),
	deleteEntry: async (entryId) => {
		await deleteTag({ data: { tagId: entryId } });
	},
};
