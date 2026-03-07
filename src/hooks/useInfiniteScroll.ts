import { useEffect, useRef, useState } from "react";

interface UseInfiniteScrollOptions<T> {
	initialItems: T[];
	initialHasMore: boolean;
	fetchMore: (offset: number) => Promise<{ items: T[]; hasMore: boolean }>;
}

export function useInfiniteScroll<T>({
	initialItems,
	initialHasMore,
	fetchMore,
}: UseInfiniteScrollOptions<T>) {
	const [allItems, setAllItems] = useState<T[]>(initialItems);
	const [hasMore, setHasMore] = useState(initialHasMore);
	const [isLoadingMore, setIsLoadingMore] = useState(false);

	const offsetRef = useRef(initialItems.length);
	const isLoadingRef = useRef(false);
	const hasMoreRef = useRef(initialHasMore);
	const fetchMoreRef = useRef(fetchMore);
	const sentinelRef = useRef<HTMLDivElement>(null);

	// Keep refs in sync with latest values
	useEffect(() => {
		hasMoreRef.current = hasMore;
	}, [hasMore]);
	useEffect(() => {
		fetchMoreRef.current = fetchMore;
	});

	// Reset when initial data changes (filter/sort change → loader re-ran)
	useEffect(() => {
		setAllItems(initialItems);
		setHasMore(initialHasMore);
		hasMoreRef.current = initialHasMore;
		offsetRef.current = initialItems.length;
	}, [initialItems, initialHasMore]);

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
			isLoadingRef.current = true;
			setIsLoadingMore(true);
			try {
				const result = await fetchMoreRef.current(offsetRef.current);
				setAllItems((previous) => [...previous, ...result.items]);
				setHasMore(result.hasMore);
				hasMoreRef.current = result.hasMore;
				offsetRef.current += result.items.length;
			} finally {
				isLoadingRef.current = false;
				setIsLoadingMore(false);
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
