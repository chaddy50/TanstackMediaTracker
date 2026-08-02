import { MediaItemType } from "#/lib/enums";

/**
 * Pulls the creator's name out of a media item's metadata. The JSONB key
 * differs per media type — a book has an author, a movie a director — so
 * callers that only know the type use this to reach the right one.
 *
 * Lives in lib/ rather than alongside the search server code because the
 * search UI needs it too, and Biome's noRestrictedImports rule bans component
 * imports of *.server modules.
 */
export function resolveCreatorName(
	type: MediaItemType,
	metadata: Record<string, unknown>,
): string | null {
	if (type === MediaItemType.BOOK) {
		return typeof metadata.author === "string" ? metadata.author : null;
	}
	if (type === MediaItemType.MOVIE) {
		return typeof metadata.director === "string" ? metadata.director : null;
	}
	if (type === MediaItemType.TV_SHOW || type === MediaItemType.PODCAST) {
		return typeof metadata.creator === "string" ? metadata.creator : null;
	}
	if (type === MediaItemType.VIDEO_GAME) {
		return typeof metadata.developer === "string" ? metadata.developer : null;
	}
	return null;
}
