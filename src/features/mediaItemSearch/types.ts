import { z } from "zod";

import { mediaTypeEnum } from "#/database/schema";
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

/**
 * Runtime schema for the search type. Must live here rather than in
 * mediaItemSearch.server.ts: searchMedia calls it at module scope to build its
 * input validator, and *.server modules are stripped from the client graph — so
 * importing it from there leaves it undefined and throws on import.
 */
export const typeSchema = z.enum([...mediaTypeEnum.enumValues, "all"] as const);
