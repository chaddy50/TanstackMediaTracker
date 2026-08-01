import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FilterAndSortOptions, ViewSubject } from "#/database/schema";
import { ViewScreen } from "#/features/screens/customView/CustomViewScreen";
import { MediaItemType, PurchaseStatus } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

let view: {
	id: number;
	name: string;
	subject: ViewSubject;
	filters?: FilterAndSortOptions;
} = { id: 1, name: "Owned books", subject: "items" };

vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({
		useLoaderData: () => ({ view, results: { items: [], hasMore: false } }),
		useSearch: () => ({}),
	}),
	useRouter: () => ({
		invalidate: vi.fn(),
		history: { back: vi.fn() },
	}),
}));

vi.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

let capturedShouldShowPurchaseStatus: boolean | undefined;
let wasMediaItemListRendered = false;

vi.mock("#/components/MediaItemList", () => ({
	MediaItemList: (props: { shouldShowPurchaseStatus?: boolean }) => {
		wasMediaItemListRendered = true;
		capturedShouldShowPurchaseStatus = props.shouldShowPurchaseStatus;
		return null;
	},
}));

vi.mock("#/components/SeriesList", () => ({ SeriesList: () => null }));

vi.mock("#/features/screens/customView/EditViewDialog", () => ({
	EditViewDialog: () => null,
}));
vi.mock("#/features/navigation/topBar/TopBar", () => ({ TopBar: () => null }));
vi.mock("#/features/navigation/topBar/components/SearchInput", () => ({
	SearchInput: () => null,
}));

// Keeps the server fns (and their drizzle client) out of the unit test.
vi.mock("#/features/screens/customView/view", () => ({
	getViewResults: vi.fn(),
	deleteView: vi.fn(),
}));

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
	view = { id: 1, name: "Owned books", subject: "items" };
	capturedShouldShowPurchaseStatus = undefined;
	wasMediaItemListRendered = false;
});

describe("ViewScreen purchase badge visibility", () => {
	it("hides the badge when the saved view pins one purchase status", () => {
		view.filters = { purchaseStatuses: [PurchaseStatus.PURCHASED] };

		render(<ViewScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(false);
	});

	it("shows the badge when the saved view allows two purchase statuses", () => {
		view.filters = {
			purchaseStatuses: [
				PurchaseStatus.PURCHASED,
				PurchaseStatus.NOT_PURCHASED,
			],
		};

		render(<ViewScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(true);
	});

	it("shows the badge when the saved filters omit purchaseStatuses", () => {
		view.filters = { mediaTypes: [MediaItemType.BOOK] };

		render(<ViewScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(true);
	});

	it("shows the badge when the view has no filters at all", () => {
		view.filters = undefined;

		render(<ViewScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(true);
	});

	it("renders no MediaItemList for a series view", () => {
		view = { id: 2, name: "Owned series", subject: "series" };

		render(<ViewScreen />);

		expect(wasMediaItemListRendered).toBe(false);
	});
});
