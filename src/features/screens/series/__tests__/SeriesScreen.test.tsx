import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FilterAndSortOptions } from "#/database/schema";
import { SeriesScreen } from "#/features/screens/series/SeriesScreen";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

let search: FilterAndSortOptions = {};
let settings: unknown = null;
let historyEntryKey = "entry-1";

vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({
		useLoaderData: () => ({ items: [], hasMore: false, settings }),
		useSearch: () => search,
	}),
	useRouter: () => ({
		state: { location: { state: { __TSR_key: historyEntryKey } } },
	}),
}));

vi.mock("#/components/SeriesList", () => ({
	SeriesList: () => <div data-testid="series-list" />,
}));

vi.mock("#/features/navigation/topBar/TopBar", () => ({
	TopBar: ({ right }: { right?: React.ReactNode }) => <div>{right}</div>,
}));
vi.mock("#/features/navigation/topBar/components/SearchInput", () => ({
	SearchInput: () => null,
}));
vi.mock("#/features/filterAndSort/FilterAndSortButton", () => ({
	FilterAndSortButton: () => null,
}));

// Keeps the server fn (and its drizzle client) out of the unit test.
vi.mock("#/features/screens/series/series", () => ({ getSeriesList: vi.fn() }));

// jsdom has no IntersectionObserver, which the real hook constructs on mount.
// The options are captured because the cache key the screen derives is the screen's
// responsibility; the hook's own behaviour is covered by its suite.
let capturedCacheKey: string | undefined;
let allItems: unknown[] = [];

vi.mock("#/components/hooks/useInfiniteScroll", () => ({
	useInfiniteScroll: (options: { cacheKey: string }) => {
		capturedCacheKey = options.cacheKey;
		return {
			allItems,
			isLoadingMore: false,
			sentinelRef: { current: null },
		};
	},
}));

afterEach(cleanup);
beforeEach(() => {
	search = {};
	settings = null;
	historyEntryKey = "entry-1";
	capturedCacheKey = undefined;
	allItems = [];
});

describe("SeriesScreen", () => {
	it("renders the list once the hook has items", () => {
		allItems = [{ id: 1, name: "Dune" }];

		render(<SeriesScreen />);

		expect(screen.getByTestId("series-list")).toBeInTheDocument();
	});

	it("shows the empty state instead of the list when there are no items", () => {
		allItems = [];

		render(<SeriesScreen />);

		expect(screen.queryByTestId("series-list")).not.toBeInTheDocument();
		expect(screen.getByText("series.empty")).toBeInTheDocument();
	});
});

// The key is what keeps the loaded pages — and therefore the scroll position —
// attached to the right query when returning from a series.
describe("SeriesScreen infinite scroll cache key", () => {
	it("derives the key from the search the list ran with", () => {
		settings = {
			defaultSeriesSortBy: "title",
			defaultSeriesSortDirection: "asc",
		};

		render(<SeriesScreen />);

		expect(capturedCacheKey).toContain("series:");
		expect(capturedCacheKey).toContain("title");
	});

	it("gives two different searches two different keys", () => {
		search = { titleQuery: "dune" };
		render(<SeriesScreen />);
		const duneKey = capturedCacheKey;

		cleanup();
		search = { titleQuery: "foundation" };
		render(<SeriesScreen />);

		expect(capturedCacheKey).not.toBe(duneKey);
		expect(capturedCacheKey).toContain("foundation");
	});
});
