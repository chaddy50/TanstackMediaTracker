import { and, eq, inArray } from "drizzle-orm";

import { db } from "#/database/index";
import { mediaItems, series } from "#/database/schema";
import * as hardcover from "#/features/mediaItemSearch/api/hardcover";
import * as igdb from "#/features/mediaItemSearch/api/igdb";
import * as tmdb from "#/features/mediaItemSearch/api/tmdb";
import type { ExternalSearchResult } from "#/features/mediaItemSearch/api/types";
import { MediaItemType } from "#/lib/enums";

/**
 * The items an external provider lists for a series that the user does not own
 * yet — the read half of the series page's "not in your library" section.
 *
 * This file uses the .server.ts convention — it must never be statically
 * imported by client-side code. Import it only from server function handler
 * bodies or other server-only modules.
 */

/**
 * Fetches every item the provider files under a series, keyed by media type.
 *
 * TV shows and podcasts are absent by design: TMDB has no collection concept
 * for TV, and a podcast "series" holds user-defined arcs rather than a roster
 * the provider knows about.
 */
const FETCH_SERIES_ITEMS_BY_TYPE: Partial<
	Record<MediaItemType, (seriesName: string) => Promise<ExternalSearchResult[]>>
> = {
	[MediaItemType.BOOK]: hardcover.fetchSeriesBooks,
	[MediaItemType.MOVIE]: tmdb.fetchCollectionMovies,
	[MediaItemType.VIDEO_GAME]: igdb.fetchCollectionGames,
};

// Enough to cover even a long-running series without flooding the grid.
const MISSING_ITEM_LIMIT = 50;

function toExternalKey(item: {
	externalId: string;
	externalSource: string;
}): string {
	return `${item.externalId}:${item.externalSource}`;
}

/**
 * Drops candidates the user already owns, and collapses duplicates the provider
 * returned more than once. The first occurrence of a key wins, and the input
 * order is preserved.
 */
export function filterOutOwnedItems(
	candidates: ExternalSearchResult[],
	ownedKeys: Set<string>,
): ExternalSearchResult[] {
	const seenKeys = new Set<string>();

	return candidates.filter((candidate) => {
		const key = toExternalKey(candidate);
		if (ownedKeys.has(key) || seenKeys.has(key)) return false;

		seenKeys.add(key);
		return true;
	});
}

function toSortableBookNumber(item: ExternalSearchResult): number {
	const bookNumber = Number(item.metadata.seriesBookNumber);
	// Unnumbered and non-numeric entries sort after every numbered one rather
	// than landing mid-list as NaN.
	return Number.isFinite(bookNumber) ? bookNumber : Number.POSITIVE_INFINITY;
}

/**
 * Orders candidates the way getSeriesDetails orders the library grid above them
 * — by series book number, then release date — so the two grids read alike.
 */
export function sortMissingItems(
	items: ExternalSearchResult[],
): ExternalSearchResult[] {
	return [...items].sort((first, second) => {
		const firstBookNumber = toSortableBookNumber(first);
		const secondBookNumber = toSortableBookNumber(second);
		// Compared rather than subtracted: providers that supply no book numbers
		// at all leave both sides Infinity, and Infinity - Infinity is NaN, which
		// would silently abandon the sort instead of falling through to the date.
		if (firstBookNumber !== secondBookNumber) {
			return firstBookNumber < secondBookNumber ? -1 : 1;
		}

		return (first.releaseDate ?? "").localeCompare(second.releaseDate ?? "");
	});
}

/**
 * The items in a series that the user has not added to their library yet.
 *
 * Returns [] rather than throwing for a missing series, another user's series,
 * an unsupported media type, or an upstream failure — this backs a
 * supplementary section that must never break the series page.
 */
export async function getMissingSeriesItems(
	seriesId: number,
	userId: string,
): Promise<ExternalSearchResult[]> {
	const [seriesRow] = await db
		.select({ name: series.name, type: series.type })
		.from(series)
		.where(and(eq(series.id, seriesId), eq(series.userId, userId)));

	if (!seriesRow) return [];

	const fetchSeriesItems = FETCH_SERIES_ITEMS_BY_TYPE[seriesRow.type];
	if (!fetchSeriesItems) return [];

	let candidates: ExternalSearchResult[] = [];
	try {
		candidates = await fetchSeriesItems(seriesRow.name);
	} catch {
		return [];
	}

	if (candidates.length === 0) return [];

	// Scoped by user rather than by series: an item the user already owns but
	// filed elsewhere is not missing from their library.
	const ownedItems = await db
		.select({
			externalId: mediaItems.externalId,
			externalSource: mediaItems.externalSource,
		})
		.from(mediaItems)
		.where(
			and(
				eq(mediaItems.userId, userId),
				inArray(
					mediaItems.externalId,
					candidates.map((candidate) => candidate.externalId),
				),
			),
		);

	const ownedKeys = new Set(ownedItems.map(toExternalKey));

	return sortMissingItems(filterOutOwnedItems(candidates, ownedKeys)).slice(
		0,
		MISSING_ITEM_LIMIT,
	);
}
