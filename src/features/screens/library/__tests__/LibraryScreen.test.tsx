import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FilterAndSortOptions } from "#/database/schema";
import { LibraryScreen } from "#/features/screens/library/LibraryScreen";
import { PurchaseStatus } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

let search: FilterAndSortOptions = {};
let settings: unknown = null;

vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({
		useLoaderData: () => ({ items: [], hasMore: false, settings }),
		useSearch: () => search,
	}),
}));

// The captured prop is the unit under test — MediaItemList's own rendering is
// covered by its suite.
let capturedShouldShowPurchaseStatus: boolean | undefined;

vi.mock("#/components/MediaItemList", () => ({
	MediaItemList: (props: { shouldShowPurchaseStatus?: boolean }) => {
		capturedShouldShowPurchaseStatus = props.shouldShowPurchaseStatus;
		return null;
	},
}));

vi.mock("#/features/navigation/topBar/TopBar", () => ({ TopBar: () => null }));
vi.mock("#/features/navigation/topBar/components/SearchInput", () => ({
	SearchInput: () => null,
}));
vi.mock("#/features/filterAndSort/FilterAndSortButton", () => ({
	FilterAndSortButton: () => null,
}));

// Keeps the server fn (and its drizzle client) out of the unit test.
vi.mock("#/features/screens/library/library", () => ({ getLibrary: vi.fn() }));

// jsdom has no IntersectionObserver, which the real hook constructs on mount.
vi.mock("#/components/hooks/useInfiniteScroll", () => ({
	useInfiniteScroll: () => ({
		allItems: [],
		isLoadingMore: false,
		sentinelRef: { current: null },
	}),
}));

afterEach(cleanup);
beforeEach(() => {
	search = {};
	settings = null;
	capturedShouldShowPurchaseStatus = undefined;
});

describe("LibraryScreen purchase badge visibility", () => {
	it("hides the badge when filtered to exactly one purchase status", () => {
		search = { purchaseStatuses: [PurchaseStatus.PURCHASED] };

		render(<LibraryScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(false);
	});

	it("shows the badge when two purchase statuses are selected", () => {
		search = {
			purchaseStatuses: [PurchaseStatus.PURCHASED, PurchaseStatus.WANT_TO_BUY],
		};

		render(<LibraryScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(true);
	});

	it("shows the badge when every purchase status is selected", () => {
		search = { purchaseStatuses: Object.values(PurchaseStatus) };

		render(<LibraryScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(true);
	});

	it("shows the badge when the purchase filter is an empty array", () => {
		search = { purchaseStatuses: [] };

		render(<LibraryScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(true);
	});

	it("shows the badge when no purchase filter is set", () => {
		search = {};

		render(<LibraryScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(true);
	});

	// Guards against applyLibrarySortDefaults dropping the filter while merging.
	it("keeps the purchase filter when sort defaults are applied", () => {
		search = { purchaseStatuses: [PurchaseStatus.PURCHASED] };
		settings = {
			defaultLibrarySortBy: "title",
			defaultLibrarySortDirection: "asc",
		};

		render(<LibraryScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(false);
	});
});
