import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MissingSeriesItems } from "#/features/screens/seriesDetails/components/MissingSeriesItems";
import {
	getMissingSeriesItems,
	type MissingSeriesItem,
} from "#/features/screens/seriesDetails/seriesDetails";
import { MediaItemType } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, options?: { count?: number }) =>
			options?.count === undefined ? key : `${key}:${options.count}`,
	}),
}));

const routerInvalidate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: routerInvalidate }),
}));

vi.mock("#/features/screens/seriesDetails/seriesDetails", () => ({
	getMissingSeriesItems: vi.fn(),
}));

/**
 * Stubbed so this suite stays about the section's state machine; the button
 * gives the onAdded cases a clean trigger.
 */
vi.mock(
	"#/features/screens/seriesDetails/components/MissingSeriesItemCard",
	() => ({
		MissingSeriesItemCard: ({
			item,
			onAdded,
		}: {
			item: MissingSeriesItem;
			onAdded: (item: MissingSeriesItem) => void;
		}) => (
			<button type="button" onClick={() => onAdded(item)}>
				{item.title}
			</button>
		),
	}),
);

const getMissingSeriesItemsMock = vi.mocked(getMissingSeriesItems);

const SERIES_ID = 12;

function buildItem(externalId: string, title: string): MissingSeriesItem {
	return {
		externalId,
		externalSource: "hardcover",
		type: MediaItemType.BOOK,
		title,
		metadata: {},
	};
}

const ITEMS = [
	buildItem("1", "The Final Empire"),
	buildItem("2", "The Well of Ascension"),
	buildItem("3", "The Hero of Ages"),
];

function renderSection(seriesType: MediaItemType = MediaItemType.BOOK) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<MissingSeriesItems seriesId={SERIES_ID} seriesType={seriesType} />
		</QueryClientProvider>,
	);
}

function getToggle() {
	return screen.getByRole("button", { name: /seriesDetails\.missingItems/ });
}

async function expandSection() {
	fireEvent.click(getToggle());
	await waitFor(() => {
		expect(getMissingSeriesItemsMock).toHaveBeenCalled();
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	getMissingSeriesItemsMock.mockResolvedValue(ITEMS);
});

afterEach(cleanup);

describe("MissingSeriesItems", () => {
	it("renders nothing for a TV show series", () => {
		const { container } = renderSection(MediaItemType.TV_SHOW);

		expect(container).toBeEmptyDOMElement();
		expect(getMissingSeriesItemsMock).not.toHaveBeenCalled();
	});

	it("renders nothing for a podcast series", () => {
		const { container } = renderSection(MediaItemType.PODCAST);

		expect(container).toBeEmptyDOMElement();
		expect(getMissingSeriesItemsMock).not.toHaveBeenCalled();
	});

	it("renders collapsed, with no items and no loading state", () => {
		renderSection();

		expect(getToggle()).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByText("The Final Empire")).not.toBeInTheDocument();
		expect(
			screen.queryByText("seriesDetails.missingItemsLoading"),
		).not.toBeInTheDocument();
	});

	it("issues no request before the first expand", () => {
		renderSection();

		expect(getMissingSeriesItemsMock).not.toHaveBeenCalled();
	});

	it("fetches once for the series when expanded", async () => {
		renderSection();
		await expandSection();

		expect(getMissingSeriesItemsMock).toHaveBeenCalledTimes(1);
		expect(getMissingSeriesItemsMock).toHaveBeenCalledWith({
			data: { seriesId: SERIES_ID },
		});
	});

	it("shows the loading state while the query is pending", async () => {
		getMissingSeriesItemsMock.mockReturnValue(new Promise(() => {}));

		renderSection();
		fireEvent.click(getToggle());

		expect(
			await screen.findByText("seriesDetails.missingItemsLoading"),
		).toBeInTheDocument();
		expect(screen.queryByText("The Final Empire")).not.toBeInTheDocument();
	});

	it("renders one card per returned item", async () => {
		renderSection();
		await expandSection();

		for (const item of ITEMS) {
			expect(await screen.findByText(item.title)).toBeInTheDocument();
		}
	});

	it("shows the loaded count in the header", async () => {
		renderSection();
		await expandSection();

		expect(
			await screen.findByText("seriesDetails.missingItemsCount:3"),
		).toBeInTheDocument();
	});

	it("shows the empty state when nothing is missing", async () => {
		getMissingSeriesItemsMock.mockResolvedValue([]);

		renderSection();
		await expandSection();

		expect(
			await screen.findByText("seriesDetails.missingItemsEmpty"),
		).toBeInTheDocument();
	});

	it("shows the error state when the query rejects", async () => {
		getMissingSeriesItemsMock.mockRejectedValue(new Error("upstream down"));

		renderSection();
		await expandSection();

		expect(
			await screen.findByText("seriesDetails.missingItemsError"),
		).toBeInTheDocument();
	});

	it("hides the list when collapsed and does not refetch on re-expand", async () => {
		renderSection();
		await expandSection();
		await screen.findByText("The Final Empire");

		fireEvent.click(getToggle());
		expect(screen.queryByText("The Final Empire")).not.toBeInTheDocument();

		fireEvent.click(getToggle());
		await screen.findByText("The Final Empire");

		expect(getMissingSeriesItemsMock).toHaveBeenCalledTimes(1);
	});

	it("drops an added item from the list and invalidates the route", async () => {
		renderSection();
		await expandSection();

		fireEvent.click(await screen.findByText("The Final Empire"));

		await waitFor(() => {
			expect(screen.queryByText("The Final Empire")).not.toBeInTheDocument();
		});
		expect(screen.getByText("The Well of Ascension")).toBeInTheDocument();
		expect(screen.getByText("The Hero of Ages")).toBeInTheDocument();
		expect(routerInvalidate).toHaveBeenCalledTimes(1);
	});

	it("falls back to the empty state once the last item is added", async () => {
		getMissingSeriesItemsMock.mockResolvedValue([ITEMS[0]]);

		renderSection();
		await expandSection();

		fireEvent.click(await screen.findByText("The Final Empire"));

		expect(
			await screen.findByText("seriesDetails.missingItemsEmpty"),
		).toBeInTheDocument();
	});
});
