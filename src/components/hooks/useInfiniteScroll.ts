import { useEffect, useRef, useState } from "react";
import { MAX_QUERY_LIMIT } from "#/lib/queries/types";

interface UseInfiniteScrollOptions<T> {
	/**
	 * Identifies the list being paged through, so that two different queries never
	 * share accumulated pages. Changing it resets the list back to page one.
	 */
	cacheKey: string;
	initialItems: T[];
	initialHasMore: boolean;
	/**
	 * Fetches one page from `offset`, or — when `limit` is given — that many rows in
	 * a single request, which is how a whole loaded window is refreshed at once.
	 */
	fetchMore: (
		offset: number,
		limit?: number,
	) => Promise<{ items: T[]; hasMore: boolean }>;
}

interface CachedPages {
	items: unknown[];
	hasMore: boolean;
}

// Opening a media item unmounts the whole `_app` layout, so without this the
// accumulated pages would collapse back to page one on the way back and the
// router's restored scroll offset would be clamped to the shorter list.
const MAX_CACHED_KEYS = 5;
const cachedPagesByKey = new Map<string, CachedPages>();

export function useInfiniteScroll<T>({
	cacheKey,
	initialItems,
	initialHasMore,
	fetchMore,
}: UseInfiniteScrollOptions<T>) {
	const cachedPages = readCachedPages<T>(cacheKey);

	const [allItems, setAllItems] = useState<T[]>(
		cachedPages?.items ?? initialItems,
	);
	const [hasMore, setHasMore] = useState(
		cachedPages?.hasMore ?? initialHasMore,
	);
	const [isLoadingMore, setIsLoadingMore] = useState(false);

	// Seeded from the cache alongside `allItems`: paging on from the wrong offset
	// would refetch a page the list already shows and duplicate every row in it.
	const offsetRef = useRef(cachedPages?.items.length ?? initialItems.length);
	const isLoadingRef = useRef(false);
	const hasMoreRef = useRef(cachedPages?.hasMore ?? initialHasMore);
	const fetchMoreRef = useRef(fetchMore);
	const previousCacheKeyRef = useRef(cacheKey);
	// Bumped whenever the query changes or the effect tears down, so both the window
	// refresh and the sentinel's pagination can tell their own result apart from one
	// belonging to a list that has since been replaced.
	const requestGenerationRef = useRef(0);
	const sentinelRef = useRef<HTMLDivElement>(null);

	// Keep refs in sync with latest values
	useEffect(() => {
		hasMoreRef.current = hasMore;
	}, [hasMore]);
	useEffect(() => {
		fetchMoreRef.current = fetchMore;
	});

	// A different query is a different list, so start it over at page one.
	// Otherwise the loader has produced new data for the *same* list — a back
	// navigation, or a `router.invalidate()` after an edit or a reorder — and the
	// rows on screen are now stale. Refresh the whole loaded window rather than
	// resetting: dropping back to page one is what collapses the scroll container
	// and loses the reader's place.
	useEffect(() => {
		requestGenerationRef.current += 1;

		function abandonRefreshInFlight() {
			// Abandons a refresh still in flight, so its rows cannot land after the
			// query has moved on.
			requestGenerationRef.current += 1;
		}

		if (previousCacheKeyRef.current !== cacheKey) {
			previousCacheKeyRef.current = cacheKey;
			applyPageOne();
			return abandonRefreshInFlight;
		}

		const targetLength = offsetRef.current;

		// Only page one is loaded, so the loader data *is* the refresh. Staying
		// synchronous here matters: the custom view's reorder hand-off waits for the
		// refreshed order to land in the same commit as the loader data.
		if (targetLength <= initialItems.length) {
			applyPageOne();
			return abandonRefreshInFlight;
		}

		// Beyond the query ceiling the server would return fewer rows than are on
		// screen, and a shorter list is exactly what clamps the restored scroll
		// offset. Leave the cached rows in place instead.
		if (targetLength > MAX_QUERY_LIMIT) {
			return abandonRefreshInFlight;
		}

		const requestGeneration = requestGenerationRef.current;

		async function refreshLoadedWindow() {
			// Held across the request so the sentinel cannot append a page that the
			// assignment below would immediately throw away.
			isLoadingRef.current = true;
			try {
				const result = await fetchMoreRef.current(0, targetLength);
				// A newer refresh, a query change, or an unmount happened while this was
				// in flight, so its rows belong to a list nobody is showing.
				if (requestGenerationRef.current !== requestGeneration) {
					return;
				}

				setAllItems(result.items);
				setHasMore(result.hasMore);
				hasMoreRef.current = result.hasMore;
				offsetRef.current = result.items.length;
			} catch {
				// A refresh that fails leaves the cached rows on screen rather than
				// emptying the list under the reader; the next visit tries again.
			} finally {
				isLoadingRef.current = false;
			}
		}

		function applyPageOne() {
			setAllItems(initialItems);
			setHasMore(initialHasMore);
			hasMoreRef.current = initialHasMore;
			offsetRef.current = initialItems.length;
		}

		refreshLoadedWindow();

		return abandonRefreshInFlight;
	}, [cacheKey, initialItems, initialHasMore]);

	useEffect(() => {
		cacheLoadedPages(cacheKey, allItems, hasMore);
	}, [cacheKey, allItems, hasMore]);

	// Set up IntersectionObserver once on mount; uses refs for all mutable state
	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel) {
			return;
		}

		async function handleIntersect(entries: IntersectionObserverEntry[]) {
			if (
				!entries[0].isIntersecting ||
				isLoadingRef.current ||
				!hasMoreRef.current
			) {
				return;
			}
			const requestGeneration = requestGenerationRef.current;
			isLoadingRef.current = true;
			setIsLoadingMore(true);
			try {
				const result = await fetchMoreRef.current(offsetRef.current);
				// The query changed while this page was in flight. Appending now would
				// splice the old list's rows onto the new one, push `offsetRef` past what
				// is on screen, and cache the mixture under the new query's key.
				if (requestGenerationRef.current !== requestGeneration) {
					return;
				}

				setAllItems((previous) => [...previous, ...result.items]);
				setHasMore(result.hasMore);
				hasMoreRef.current = result.hasMore;
				offsetRef.current += result.items.length;
			} finally {
				// A newer request owns the loading state now; clearing it here would
				// unblock the sentinel while that one is still running.
				if (requestGenerationRef.current === requestGeneration) {
					isLoadingRef.current = false;
					setIsLoadingMore(false);
				}
			}
		}

		const observer = new IntersectionObserver(handleIntersect, {
			rootMargin: "200px",
		});
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, []); // No deps — all mutable values are accessed via refs

	return { allItems, hasMore, isLoadingMore, sentinelRef };
}

// ---- Private helpers

function readCachedPages<T>(
	cacheKey: string,
): { items: T[]; hasMore: boolean } | undefined {
	const cachedPages = cachedPagesByKey.get(cacheKey);
	if (!cachedPages) {
		return undefined;
	}

	return { items: cachedPages.items as T[], hasMore: cachedPages.hasMore };
}

function cacheLoadedPages<T>(cacheKey: string, items: T[], hasMore: boolean) {
	// Re-setting an existing key leaves it where it was in insertion order, so
	// delete first to move it to the back and make eviction least-recently-used.
	// Otherwise the list the user keeps returning to is the first one evicted.
	cachedPagesByKey.delete(cacheKey);
	cachedPagesByKey.set(cacheKey, { items, hasMore });
	if (cachedPagesByKey.size <= MAX_CACHED_KEYS) {
		return;
	}

	const oldestCacheKey = cachedPagesByKey.keys().next().value;
	if (oldestCacheKey !== undefined) {
		cachedPagesByKey.delete(oldestCacheKey);
	}
}
