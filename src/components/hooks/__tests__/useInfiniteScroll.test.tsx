import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubIntersectionObserver } from "#/tests/intersectionObserver";

interface TestItem {
	id: number;
	label: string;
}

interface TestListProps {
	cacheKey: string;
	initialItems: TestItem[];
	initialHasMore: boolean;
	fetchMore: (
		offset: number,
		limit?: number,
	) => Promise<{ items: TestItem[]; hasMore: boolean }>;
}

const PAGE_SIZE = 48;

// The page cache lives at module scope, so every test re-imports the hook against a fresh
// module registry — otherwise one test's accumulated pages seed the next one's mount.
let useInfiniteScroll: typeof import("#/components/hooks/useInfiniteScroll").useInfiniteScroll;
let observerStub: ReturnType<typeof stubIntersectionObserver>;

function makePage(
	offset: number,
	label: string,
	count = PAGE_SIZE,
): TestItem[] {
	return Array.from({ length: count }, (_, index) => ({
		id: offset + index,
		label,
	}));
}

/**
 * A stand-in for the paged server fn: honours both `offset` and the `limit` the
 * window refresh sends, so a refresh returns as many rows as it asked for.
 */
function pagingFetch(
	label: string,
	total = PAGE_SIZE * 4,
	pageSize = PAGE_SIZE,
) {
	return vi.fn((offset: number, limit: number = pageSize) => {
		const count = Math.max(0, Math.min(limit, total - offset));
		return Promise.resolve({
			items: makePage(offset, label, count),
			hasMore: offset + count < total,
		});
	});
}

function TestList({
	cacheKey,
	initialItems,
	initialHasMore,
	fetchMore,
}: TestListProps) {
	const { allItems, hasMore, isLoadingMore, sentinelRef } =
		useInfiniteScroll<TestItem>({
			cacheKey,
			initialItems,
			initialHasMore,
			fetchMore,
		});

	return (
		<div>
			<span data-testid="count">{allItems.length}</span>
			<span data-testid="labels">
				{[...new Set(allItems.map((item) => item.label))].join(",")}
			</span>
			<span data-testid="hasMore">{String(hasMore)}</span>
			<span data-testid="isLoadingMore">{String(isLoadingMore)}</span>
			<div ref={sentinelRef} />
		</div>
	);
}

/** Lets queued promises settle and React flush the resulting state updates. */
async function flush() {
	await act(async () => {
		await Promise.resolve();
		await Promise.resolve();
	});
}

/** Runs a synchronous body inside `act` and lets the resulting updates settle. */
async function actSync(body: () => void) {
	await act(async () => {
		body();
		await Promise.resolve();
	});
}

/** A request that stays in flight, so a test can assert before it lands. */
function neverSettles<T>(): Promise<T> {
	// The executor deliberately ignores both callbacks.
	return new Promise(() => undefined);
}

async function fireSentinel() {
	await actSync(() => {
		observerStub.trigger();
	});
	await flush();
}

function renderedCount() {
	return Number(screen.getByTestId("count").textContent);
}

function renderedLabels() {
	return screen.getByTestId("labels").textContent;
}

beforeEach(async () => {
	vi.resetModules();
	({ useInfiniteScroll } = await import(
		"#/components/hooks/useInfiniteScroll"
	));
	observerStub = stubIntersectionObserver();
});

afterEach(() => {
	cleanup();
	observerStub.restore();
});

describe("useInfiniteScroll", () => {
	it("seeds from initialItems when the cache holds nothing for the key", async () => {
		const fetchMore = vi.fn();

		render(
			<TestList
				cacheKey="empty-cache"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={fetchMore}
			/>,
		);
		await flush();

		expect(renderedCount()).toBe(PAGE_SIZE);
		// Nothing beyond page one has been loaded, so there is nothing to refresh.
		expect(fetchMore).not.toHaveBeenCalled();
	});

	it("keeps accumulated pages across an unmount and remount with the same cacheKey", async () => {
		const fetchMore = vi.fn().mockResolvedValue({
			items: makePage(PAGE_SIZE, "stale"),
			hasMore: false,
		});

		const first = render(
			<TestList
				cacheKey="remount"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={fetchMore}
			/>,
		);
		await fireSentinel();
		expect(renderedCount()).toBe(PAGE_SIZE * 2);

		first.unmount();

		// A refresh that never resolves, so the assertion sees the seeded state alone.
		const pendingFetch = vi.fn().mockReturnValue(neverSettles());
		render(
			<TestList
				cacheKey="remount"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={pendingFetch}
			/>,
		);

		// The very first render already has both pages: this is the assertion that
		// fails without the fix, and the shorter list is what clamps the restored
		// scroll offset.
		expect(renderedCount()).toBe(PAGE_SIZE * 2);
	});

	it("preserves the list length when new loader data arrives for an unchanged cacheKey", async () => {
		const fetchMore = pagingFetch("stale");

		const { rerender } = render(
			<TestList
				cacheKey="same-key"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={fetchMore}
			/>,
		);
		await fireSentinel();
		expect(renderedCount()).toBe(PAGE_SIZE * 2);

		// A fresh array of equivalent rows, exactly what a loader re-run produces.
		rerender(
			<TestList
				cacheKey="same-key"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={fetchMore}
			/>,
		);
		await flush();

		expect(renderedCount()).toBe(PAGE_SIZE * 2);
	});

	it("refreshes the rows beyond page one when the loader returns new data", async () => {
		const staleFetch = vi.fn().mockResolvedValue({
			items: makePage(PAGE_SIZE, "stale"),
			hasMore: false,
		});

		const first = render(
			<TestList
				cacheKey="refresh"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={staleFetch}
			/>,
		);
		await fireSentinel();
		expect(renderedLabels()).toBe("stale");

		first.unmount();

		const freshFetch = vi.fn().mockResolvedValue({
			items: makePage(0, "fresh", PAGE_SIZE * 2),
			hasMore: false,
		});
		render(
			<TestList
				cacheKey="refresh"
				initialItems={makePage(0, "fresh")}
				initialHasMore
				fetchMore={freshFetch}
			/>,
		);
		await flush();

		// The whole loaded window comes back in one request, so an edit made on the
		// details screen shows without a round trip per page.
		expect(freshFetch).toHaveBeenCalledTimes(1);
		expect(freshFetch).toHaveBeenCalledWith(0, PAGE_SIZE * 2);
		expect(renderedLabels()).toBe("fresh");
		expect(renderedCount()).toBe(PAGE_SIZE * 2);
	});

	it("asks for exactly the window that was loaded", async () => {
		const fetchMore = vi
			.fn()
			.mockResolvedValueOnce({
				items: makePage(PAGE_SIZE, "stale"),
				hasMore: true,
			})
			.mockResolvedValueOnce({
				items: makePage(PAGE_SIZE * 2, "stale"),
				hasMore: true,
			});

		const first = render(
			<TestList
				cacheKey="bounded-refresh"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={fetchMore}
			/>,
		);
		await fireSentinel();
		await fireSentinel();
		expect(renderedCount()).toBe(PAGE_SIZE * 3);
		first.unmount();

		const refreshFetch = vi.fn().mockResolvedValue({
			items: makePage(0, "fresh", PAGE_SIZE * 3),
			hasMore: true,
		});
		render(
			<TestList
				cacheKey="bounded-refresh"
				initialItems={makePage(0, "fresh")}
				initialHasMore
				fetchMore={refreshFetch}
			/>,
		);
		await flush();

		// Three pages had been scrolled in, so the refresh asks for exactly 144 rows
		// from offset zero — one request, no matter how deep the list had grown.
		expect(refreshFetch).toHaveBeenCalledTimes(1);
		expect(refreshFetch).toHaveBeenCalledWith(0, PAGE_SIZE * 3);
	});

	it("leaves the cached rows alone when the window exceeds the query ceiling", async () => {
		// MAX_QUERY_LIMIT is 500, so two 300-row pages put the window out of reach.
		const bigPage = 300;
		const fetchMore = pagingFetch("stale", bigPage * 2, bigPage);

		const first = render(
			<TestList
				cacheKey="over-ceiling"
				initialItems={makePage(0, "stale", bigPage)}
				initialHasMore
				fetchMore={fetchMore}
			/>,
		);
		await fireSentinel();
		expect(renderedCount()).toBe(bigPage * 2);
		first.unmount();

		const remountFetch = pagingFetch("fresh", bigPage * 2, bigPage);
		render(
			<TestList
				cacheKey="over-ceiling"
				initialItems={makePage(0, "fresh", bigPage)}
				initialHasMore
				fetchMore={remountFetch}
			/>,
		);
		await flush();

		// Asking the server for 600 rows would come back capped at 500, and a list
		// shorter than the cached one is what clamps the restored scroll offset.
		expect(remountFetch).not.toHaveBeenCalled();
		expect(renderedCount()).toBe(bigPage * 2);
	});

	it("resets to the new page one when the cacheKey changes", async () => {
		const fetchMore = vi.fn().mockResolvedValue({
			items: makePage(PAGE_SIZE, "stale"),
			hasMore: true,
		});

		const { rerender } = render(
			<TestList
				cacheKey="filters-a"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={fetchMore}
			/>,
		);
		await fireSentinel();
		expect(renderedCount()).toBe(PAGE_SIZE * 2);

		fetchMore.mockClear();
		rerender(
			<TestList
				cacheKey="filters-b"
				initialItems={makePage(0, "other", 10)}
				initialHasMore={false}
				fetchMore={fetchMore}
			/>,
		);
		await flush();

		expect(renderedCount()).toBe(10);
		expect(renderedLabels()).toBe("other");
		expect(screen.getByTestId("hasMore").textContent).toBe("false");
		// A different query is a different list, so there is nothing to refresh.
		expect(fetchMore).not.toHaveBeenCalled();
	});

	it("resets pagination when the cacheKey changes", async () => {
		const fetchMore = vi.fn().mockResolvedValue({
			items: makePage(PAGE_SIZE, "stale"),
			hasMore: true,
		});

		const { rerender } = render(
			<TestList
				cacheKey="paging-a"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={fetchMore}
			/>,
		);
		await fireSentinel();

		rerender(
			<TestList
				cacheKey="paging-b"
				initialItems={makePage(0, "other", 10)}
				initialHasMore
				fetchMore={fetchMore}
			/>,
		);
		await flush();

		fetchMore.mockClear();
		fetchMore.mockResolvedValue({
			items: makePage(10, "other"),
			hasMore: false,
		});
		await fireSentinel();

		// Offset 10 (the new page one), not the 96 carried over from the old query.
		expect(fetchMore).toHaveBeenCalledWith(10);
	});

	it("pages on from the restored length after a remount", async () => {
		const fetchMore = pagingFetch("stale");

		const first = render(
			<TestList
				cacheKey="offset-seed"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={fetchMore}
			/>,
		);
		await fireSentinel();
		first.unmount();

		const remountFetch = pagingFetch("stale");
		render(
			<TestList
				cacheKey="offset-seed"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={remountFetch}
			/>,
		);
		await flush();

		remountFetch.mockClear();
		await fireSentinel();

		// Offset 96, not 48 — refetching page two would duplicate every row in it.
		expect(remountFetch).toHaveBeenCalledWith(PAGE_SIZE * 2);
		expect(renderedCount()).toBe(PAGE_SIZE * 3);
	});

	it("does not page on after remounting an exhausted list", async () => {
		const fetchMore = vi.fn().mockResolvedValue({
			items: makePage(PAGE_SIZE, "stale"),
			hasMore: false,
		});

		const first = render(
			<TestList
				cacheKey="exhausted"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={fetchMore}
			/>,
		);
		await fireSentinel();
		expect(screen.getByTestId("hasMore").textContent).toBe("false");
		first.unmount();

		const remountFetch = vi.fn().mockResolvedValue({
			items: makePage(PAGE_SIZE, "stale"),
			hasMore: false,
		});
		render(
			<TestList
				cacheKey="exhausted"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={remountFetch}
			/>,
		);
		await flush();

		remountFetch.mockClear();
		await fireSentinel();

		expect(remountFetch).not.toHaveBeenCalled();
	});

	it("abandons a refresh that is still in flight when the cacheKey changes", async () => {
		const staleFetch = vi.fn().mockResolvedValue({
			items: makePage(PAGE_SIZE, "stale"),
			hasMore: true,
		});

		const first = render(
			<TestList
				cacheKey="abandon"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={staleFetch}
			/>,
		);
		await fireSentinel();
		first.unmount();

		let resolveRefresh!: (value: {
			items: TestItem[];
			hasMore: boolean;
		}) => void;
		const blockedFetch = vi.fn().mockReturnValue(
			new Promise<{ items: TestItem[]; hasMore: boolean }>((resolve) => {
				resolveRefresh = resolve;
			}),
		);

		const { rerender } = render(
			<TestList
				cacheKey="abandon"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={blockedFetch}
			/>,
		);

		rerender(
			<TestList
				cacheKey="abandon-other"
				initialItems={makePage(0, "other", 5)}
				initialHasMore={false}
				fetchMore={blockedFetch}
			/>,
		);
		await flush();
		expect(renderedCount()).toBe(5);

		await actSync(() => {
			resolveRefresh({ items: makePage(PAGE_SIZE, "stale"), hasMore: true });
		});
		await flush();

		// The late page belongs to a query nobody is showing any more.
		expect(renderedCount()).toBe(5);
		expect(renderedLabels()).toBe("other");
	});

	it("does not let the sentinel append while a refresh is in flight", async () => {
		const staleFetch = vi.fn().mockResolvedValue({
			items: makePage(PAGE_SIZE, "stale"),
			hasMore: true,
		});

		const first = render(
			<TestList
				cacheKey="no-overlap"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={staleFetch}
			/>,
		);
		await fireSentinel();
		first.unmount();

		const blockedFetch = vi.fn().mockReturnValue(neverSettles());
		render(
			<TestList
				cacheKey="no-overlap"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={blockedFetch}
			/>,
		);

		// One call for the in-flight refresh; the sentinel must not add a second.
		expect(blockedFetch).toHaveBeenCalledTimes(1);
		await fireSentinel();
		expect(blockedFetch).toHaveBeenCalledTimes(1);
		expect(renderedCount()).toBe(PAGE_SIZE * 2);
	});

	it("evicts the least recently used key once the cache is full", async () => {
		async function loadTwoPages(cacheKey: string) {
			const fetchMore = pagingFetch("stale", PAGE_SIZE * 2);
			const view = render(
				<TestList
					cacheKey={cacheKey}
					initialItems={makePage(0, "stale")}
					initialHasMore
					fetchMore={fetchMore}
				/>,
			);
			await fireSentinel();
			await flush();
			view.unmount();
		}

		// MAX_CACHED_KEYS is 5.
		for (const cacheKey of ["k0", "k1", "k2", "k3", "k4"]) {
			await loadTwoPages(cacheKey);
		}

		// Touch k0 again so it is the most recently used rather than the oldest.
		await loadTwoPages("k0");
		// Sixth distinct key pushes the cache over its bound.
		await loadTwoPages("k5");

		const pendingFetch = vi.fn().mockReturnValue(neverSettles());
		const evicted = render(
			<TestList
				cacheKey="k1"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={pendingFetch}
			/>,
		);
		expect(renderedCount()).toBe(PAGE_SIZE);
		evicted.unmount();

		render(
			<TestList
				cacheKey="k0"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={pendingFetch}
			/>,
		);
		expect(renderedCount()).toBe(PAGE_SIZE * 2);
	});

	it("toggles isLoadingMore around a sentinel fetch", async () => {
		let resolveFetch!: (value: { items: TestItem[]; hasMore: boolean }) => void;
		const fetchMore = vi.fn().mockReturnValue(
			new Promise<{ items: TestItem[]; hasMore: boolean }>((resolve) => {
				resolveFetch = resolve;
			}),
		);

		render(
			<TestList
				cacheKey="loading-flag"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={fetchMore}
			/>,
		);
		await flush();

		await actSync(() => {
			observerStub.trigger();
		});
		expect(screen.getByTestId("isLoadingMore").textContent).toBe("true");

		await actSync(() => {
			resolveFetch({ items: makePage(PAGE_SIZE, "stale"), hasMore: false });
		});
		await flush();

		expect(screen.getByTestId("isLoadingMore").textContent).toBe("false");
	});

	it("does not double-fetch when the sentinel fires twice before the first resolves", async () => {
		let resolveFetch!: (value: { items: TestItem[]; hasMore: boolean }) => void;
		const fetchMore = vi.fn().mockReturnValue(
			new Promise<{ items: TestItem[]; hasMore: boolean }>((resolve) => {
				resolveFetch = resolve;
			}),
		);

		render(
			<TestList
				cacheKey="no-double-fetch"
				initialItems={makePage(0, "stale")}
				initialHasMore
				fetchMore={fetchMore}
			/>,
		);
		await flush();

		await actSync(() => {
			observerStub.trigger();
			observerStub.trigger();
		});

		expect(fetchMore).toHaveBeenCalledTimes(1);

		await actSync(() => {
			resolveFetch({ items: makePage(PAGE_SIZE, "stale"), hasMore: false });
		});
		await flush();

		expect(renderedCount()).toBe(PAGE_SIZE * 2);
	});
});
