import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FilterAndSortOptions, ViewSubject } from "#/database/schema";
import { ViewScreen } from "#/features/screens/customView/CustomViewScreen";
import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";
import type { ItemStats } from "#/lib/queries/types";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

let view: {
	id: number;
	name: string;
	subject: ViewSubject;
	filters?: FilterAndSortOptions;
} = { id: 1, name: "Owned books", subject: "items" };

// A stable object, as the real loader data is: only a refetch replaces it.
let loaderResults: { items: unknown[]; hasMore: boolean } = {
	items: [],
	hasMore: false,
};

/** Mimics the loader handing back a fresh result set. */
function simulateLoaderRefresh() {
	loaderResults = { items: [], hasMore: false };
}

// Series views carry no per-item stats, so the loader hands back null for them.
const EMPTY_STATS: ItemStats = {
	totalCount: 0,
	completedCount: 0,
	purchasedCount: 0,
	droppedCount: 0,
	averageRating: null,
};

let stats: ItemStats | null = EMPTY_STATS;

const routerInvalidate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({
		useLoaderData: () => ({ view, results: loaderResults, stats }),
		useSearch: () => ({}),
	}),
	useRouter: () => ({
		invalidate: routerInvalidate,
		history: { back: vi.fn() },
	}),
}));

vi.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

let capturedShouldShowPurchaseStatus: boolean | undefined;
let capturedShouldShowStatus: boolean | undefined;
let wasMediaItemListRendered = false;

vi.mock("#/components/MediaItemList", () => ({
	MediaItemList: (props: {
		shouldShowPurchaseStatus?: boolean;
		shouldShowStatus?: boolean;
	}) => {
		wasMediaItemListRendered = true;
		capturedShouldShowPurchaseStatus = props.shouldShowPurchaseStatus;
		capturedShouldShowStatus = props.shouldShowStatus;
		return <div data-testid="media-item-list" />;
	},
}));

// StatsBar's own rendering is covered by its suite; here only the hand-off and
// the screen's decision to show it at all matter.
let capturedStats: ItemStats | undefined;
let capturedFilters: FilterAndSortOptions | null | undefined;

vi.mock("#/components/StatsBar", () => ({
	StatsBar: (props: {
		stats: ItemStats;
		filters?: FilterAndSortOptions | null;
	}) => {
		capturedStats = props.stats;
		capturedFilters = props.filters;
		return <div data-testid="stats-bar" />;
	},
}));

vi.mock("#/components/SeriesList", () => ({ SeriesList: () => null }));

vi.mock("#/features/screens/customView/EditViewDialog", () => ({
	EditViewDialog: () => null,
}));
// Renders the action slot so the reorder toggle is reachable.
vi.mock("#/features/navigation/topBar/TopBar", () => ({
	TopBar: ({
		right,
		below,
	}: {
		right?: React.ReactNode;
		below?: React.ReactNode;
	}) => (
		<div>
			{right}
			<div data-testid="top-bar-below">{below}</div>
		</div>
	),
}));
vi.mock("#/features/navigation/topBar/components/SearchInput", () => ({
	SearchInput: () => null,
}));

let capturedOnReorder: ((orderedMediaItemIds: number[]) => void) | null = null;
vi.mock("#/features/screens/customView/components/ReorderableItemGrid", () => ({
	ReorderableItemGrid: ({
		onReorder,
	}: {
		onReorder: (orderedMediaItemIds: number[]) => void;
	}) => {
		capturedOnReorder = onReorder;
		return <div data-testid="reorderable-grid" />;
	},
}));

// Keeps the server fns (and their drizzle client) out of the unit test.
const getViewOrderItems = vi.fn().mockResolvedValue([]);
const reorderViewItems = vi.fn().mockResolvedValue(undefined);
vi.mock("#/features/screens/customView/view", () => ({
	getViewResults: vi.fn(),
	deleteView: vi.fn(),
	reorderViewItems: (...args: unknown[]) => reorderViewItems(...args),
	getViewOrderItems: (...args: unknown[]) => getViewOrderItems(...args),
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
	stats = EMPTY_STATS;
	capturedStats = undefined;
	capturedFilters = undefined;
	capturedShouldShowPurchaseStatus = undefined;
	capturedShouldShowStatus = undefined;
	wasMediaItemListRendered = false;
	loaderResults = { items: [], hasMore: false };
	routerInvalidate.mockClear();
	// The real invalidate refetches, then commits new loader data.
	routerInvalidate.mockImplementation(async () => {
		simulateLoaderRefresh();
	});
	getViewOrderItems.mockClear();
	getViewOrderItems.mockResolvedValue([]);
	capturedOnReorder = null;
	reorderViewItems.mockClear();
	reorderViewItems.mockResolvedValue(undefined);
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

describe("ViewScreen status badge visibility", () => {
	it("hides the badge when the saved view pins one status", () => {
		view.filters = { statuses: [MediaItemStatus.IN_PROGRESS] };

		render(<ViewScreen />);

		expect(capturedShouldShowStatus).toBe(false);
	});

	it("shows the badge when the saved view allows two statuses", () => {
		view.filters = {
			statuses: [MediaItemStatus.IN_PROGRESS, MediaItemStatus.COMPLETED],
		};

		render(<ViewScreen />);

		expect(capturedShouldShowStatus).toBe(true);
	});

	it("shows the badge when the saved filters omit statuses", () => {
		view.filters = { mediaTypes: [MediaItemType.BOOK] };

		render(<ViewScreen />);

		expect(capturedShouldShowStatus).toBe(true);
	});

	it("shows the badge when the view has no filters at all", () => {
		view.filters = undefined;

		render(<ViewScreen />);

		expect(capturedShouldShowStatus).toBe(true);
	});

	it("derives the status and purchase flags independently", () => {
		view.filters = {
			statuses: [MediaItemStatus.IN_PROGRESS],
			purchaseStatuses: [],
		};

		render(<ViewScreen />);

		expect(capturedShouldShowStatus).toBe(false);
		expect(capturedShouldShowPurchaseStatus).toBe(true);
	});
});

describe("ViewScreen stats bar", () => {
	it("renders the stats bar for an item view", () => {
		render(<ViewScreen />);

		expect(screen.getByTestId("stats-bar")).toBeInTheDocument();
	});

	// The bar hides counts the view's own filters have already settled, so it
	// needs those filters.
	it("hands the bar the view's filters", () => {
		view.filters = { statuses: [MediaItemStatus.COMPLETED] };

		render(<ViewScreen />);

		expect(capturedFilters).toEqual({
			statuses: [MediaItemStatus.COMPLETED],
		});
	});

	// The bar belongs to the sticky header, so it stays on screen while the grid
	// scrolls underneath it.
	it("renders the bar in the top bar rather than in the scrolling list", () => {
		render(<ViewScreen />);

		expect(screen.getByTestId("top-bar-below")).toContainElement(
			screen.getByTestId("stats-bar"),
		);
	});

	// Series views count series, not items, so there is nothing for the bar to say.
	it("renders no stats bar for a series view", () => {
		view = { id: 2, name: "Owned series", subject: "series" };
		stats = null;

		render(<ViewScreen />);

		expect(screen.queryByTestId("stats-bar")).not.toBeInTheDocument();
	});

	it("hides the stats bar while reordering", async () => {
		view.filters = { sortBy: "custom" };
		render(<ViewScreen />);

		fireEvent.click(screen.getByRole("button", { name: "views.reorder" }));

		expect(await screen.findByTestId("reorderable-grid")).toBeInTheDocument();
		expect(screen.queryByTestId("stats-bar")).not.toBeInTheDocument();
	});

	it("restores the stats bar when reordering ends", async () => {
		view.filters = { sortBy: "custom" };
		render(<ViewScreen />);

		fireEvent.click(screen.getByRole("button", { name: "views.reorder" }));
		await screen.findByTestId("reorderable-grid");

		fireEvent.click(
			screen.getByRole("button", { name: "views.doneReordering" }),
		);

		await screen.findByTestId("media-item-list");
		expect(screen.getByTestId("stats-bar")).toBeInTheDocument();
	});

	it("forwards the loader's stats unchanged", () => {
		const loaderStats: ItemStats = {
			totalCount: 12,
			completedCount: 5,
			purchasedCount: 4,
			droppedCount: 1,
			averageRating: 4.2,
		};
		stats = loaderStats;

		render(<ViewScreen />);

		expect(capturedStats).toBe(loaderStats);
	});
});

describe("ViewScreen reorder mode", () => {
	/** Finds the reorder toggle, which every item view offers. */
	function queryReorderButton() {
		return screen.queryByRole("button", { name: "views.reorder" });
	}

	it("offers reordering for a custom-ordered item view", () => {
		view.filters = { sortBy: "custom" };

		render(<ViewScreen />);

		expect(queryReorderButton()).toBeInTheDocument();
	});

	// Arranging a view by hand is what switches it to custom order, so the
	// entry point cannot be gated on the view already being custom-ordered.
	it("offers reordering for an item view sorted by something else", () => {
		view.filters = { sortBy: "series" };

		render(<ViewScreen />);

		expect(queryReorderButton()).toBeInTheDocument();
	});

	it("offers reordering for an item view with no filters", () => {
		view.filters = undefined;

		render(<ViewScreen />);

		expect(queryReorderButton()).toBeInTheDocument();
	});

	// Custom order is keyed on media items, so a series view can never use it.
	it("does not offer reordering for a series view", () => {
		view = {
			id: 2,
			name: "Owned series",
			subject: "series",
			filters: { sortBy: "custom" },
		};

		render(<ViewScreen />);

		expect(queryReorderButton()).not.toBeInTheDocument();
	});

	it("loads the whole result set when reordering starts", async () => {
		view.filters = { sortBy: "custom" };
		render(<ViewScreen />);

		fireEvent.click(screen.getByRole("button", { name: "views.reorder" }));

		await waitFor(() => {
			expect(getViewOrderItems).toHaveBeenCalledWith({
				data: { viewId: view.id },
			});
		});
	});

	it("swaps the paginated list for the reorderable grid", async () => {
		view.filters = { sortBy: "custom" };
		render(<ViewScreen />);
		expect(screen.getByTestId("media-item-list")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "views.reorder" }));

		expect(await screen.findByTestId("reorderable-grid")).toBeInTheDocument();
		expect(screen.queryByTestId("media-item-list")).not.toBeInTheDocument();
	});

	it("restores the paginated list and refetches when reordering ends", async () => {
		view.filters = { sortBy: "custom" };
		render(<ViewScreen />);

		fireEvent.click(screen.getByRole("button", { name: "views.reorder" }));
		await screen.findByTestId("reorderable-grid");

		fireEvent.click(
			screen.getByRole("button", { name: "views.doneReordering" }),
		);

		expect(await screen.findByTestId("media-item-list")).toBeInTheDocument();
		expect(screen.queryByTestId("reorderable-grid")).not.toBeInTheDocument();
		await waitFor(() => {
			expect(routerInvalidate).toHaveBeenCalledTimes(1);
		});
	});
});

describe("ViewScreen reorder persistence", () => {
	/** Enters reorder mode and hands back the grid's reorder callback. */
	async function startReordering() {
		view.filters = { sortBy: "custom" };
		render(<ViewScreen />);
		fireEvent.click(screen.getByRole("button", { name: "views.reorder" }));
		await screen.findByTestId("reorderable-grid");
	}

	it("saves the new order the grid reports", async () => {
		await startReordering();

		act(() => {
			capturedOnReorder?.([3, 1, 2]);
		});

		await waitFor(() => {
			expect(reorderViewItems).toHaveBeenCalledWith({
				data: { viewId: view.id, orderedMediaItemIds: [3, 1, 2] },
			});
		});
	});

	// The bug this guards: Done used to refetch while the save was still in
	// flight, so the loader re-read the pre-drag order and the reordering
	// looked like it had been thrown away.
	it("waits for an in-flight save before refetching", async () => {
		let releaseSave: () => void = () => {};
		reorderViewItems.mockReturnValue(
			new Promise<void>((resolve) => {
				releaseSave = () => resolve();
			}),
		);
		await startReordering();

		act(() => {
			capturedOnReorder?.([3, 1, 2]);
		});
		fireEvent.click(
			screen.getByRole("button", { name: "views.doneReordering" }),
		);

		// Still saving — refetching now would read the old order.
		await Promise.resolve();
		expect(routerInvalidate).not.toHaveBeenCalled();

		await act(async () => {
			releaseSave();
		});

		await waitFor(() => {
			expect(routerInvalidate).toHaveBeenCalledTimes(1);
		});
	});

	it("surfaces a failed save instead of silently dropping it", async () => {
		reorderViewItems.mockRejectedValue(new Error("network down"));
		await startReordering();

		act(() => {
			capturedOnReorder?.([3, 1, 2]);
		});

		expect(await screen.findByText("views.reorderFailed")).toBeInTheDocument();
	});
});

describe("ViewScreen reorder hand-off", () => {
	// The bug this guards: Done used to hand the screen back to the paginated
	// list before the refetch landed, so the list painted its stale pre-drag
	// order and the items visibly snapped back before jumping into place.
	it("keeps the grid up until the refreshed list data has arrived", async () => {
		let releaseInvalidate: () => void = () => {};
		routerInvalidate.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					releaseInvalidate = () => {
						simulateLoaderRefresh();
						resolve();
					};
				}),
		);

		view.filters = { sortBy: "custom" };
		render(<ViewScreen />);
		fireEvent.click(screen.getByRole("button", { name: "views.reorder" }));
		await screen.findByTestId("reorderable-grid");

		fireEvent.click(
			screen.getByRole("button", { name: "views.doneReordering" }),
		);
		await waitFor(() => {
			expect(routerInvalidate).toHaveBeenCalled();
		});

		// Mid-refetch: the arrangement stays on screen, the stale list stays away.
		expect(screen.getByTestId("reorderable-grid")).toBeInTheDocument();
		expect(screen.queryByTestId("media-item-list")).not.toBeInTheDocument();

		await act(async () => {
			releaseInvalidate();
		});

		expect(await screen.findByTestId("media-item-list")).toBeInTheDocument();
		expect(screen.queryByTestId("reorderable-grid")).not.toBeInTheDocument();
	});
});

describe("ViewScreen reorder hand-off under a deferred transition", () => {
	// The bug this guards: the router commits loader updates inside a React
	// transition, so `invalidate()` can resolve while the new data is still
	// uncommitted. Anything that swapped back on a timer raced that transition
	// and let the list paint its pre-drag order first.
	it("does not swap back while invalidate has resolved but the data has not", async () => {
		routerInvalidate.mockResolvedValue(undefined);

		view.filters = { sortBy: "custom" };
		render(<ViewScreen />);
		fireEvent.click(screen.getByRole("button", { name: "views.reorder" }));
		await screen.findByTestId("reorderable-grid");

		fireEvent.click(
			screen.getByRole("button", { name: "views.doneReordering" }),
		);
		await waitFor(() => {
			expect(routerInvalidate).toHaveBeenCalled();
		});

		// Data still pending: the arrangement must stay on screen.
		expect(screen.getByTestId("reorderable-grid")).toBeInTheDocument();
		expect(screen.queryByTestId("media-item-list")).not.toBeInTheDocument();

		// The transition finally commits the refreshed data.
		await act(async () => {
			simulateLoaderRefresh();
			fireEvent.click(screen.getByRole("button", { name: "views.editView" }));
		});

		expect(await screen.findByTestId("media-item-list")).toBeInTheDocument();
		expect(screen.queryByTestId("reorderable-grid")).not.toBeInTheDocument();
	});
});
