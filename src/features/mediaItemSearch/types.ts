import type { ExternalSearchResult } from "#/features/mediaItemSearch/api/types";
import type { MediaItemStatus, MediaItemType } from "#/lib/enums";

/**
 * An external search result annotated with the user's library state. Lives here
 * rather than in search.server.ts because the search UI needs it, and Biome's
 * noRestrictedImports rule bans component imports of *.server modules —
 * including type-only ones, which it cannot distinguish.
 */
export type SearchResultWithStatus = ExternalSearchResult & {
	mediaItemId?: number;
	status?: MediaItemStatus;
};

export type SearchType = "all" | MediaItemType;
