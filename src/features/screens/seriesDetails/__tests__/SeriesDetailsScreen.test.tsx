import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SeriesDetailsScreen } from "#/features/screens/seriesDetails/SeriesDetailsScreen";
import { MediaItemType } from "#/lib/enums";

const seriesDetailsFixture = {
	id: 12,
	type: MediaItemType.BOOK,
	items: [],
};

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({ useLoaderData: () => seriesDetailsFixture }),
	useNavigate: () => vi.fn(),
}));

vi.mock("#/features/screens/seriesDetails/seriesDetails", () => ({
	deleteSeries: vi.fn(),
}));

vi.mock("#/features/navigation/topBar/TopBar", () => ({
	TopBar: () => <div data-testid="top-bar" />,
}));

vi.mock("#/features/screens/seriesDetails/components/SeriesInfo", () => ({
	SeriesInfo: () => <div data-testid="series-info" />,
}));

vi.mock("#/features/screens/seriesDetails/components/SeriesItems", () => ({
	SeriesItems: () => <div data-testid="series-items" />,
}));

vi.mock(
	"#/features/screens/seriesDetails/components/MissingSeriesItems",
	() => ({
		MissingSeriesItems: ({
			seriesId,
			seriesType,
		}: {
			seriesId: number;
			seriesType: string;
		}) => (
			<div
				data-testid="missing-series-items"
				data-series-id={seriesId}
				data-series-type={seriesType}
			/>
		),
	}),
);

afterEach(cleanup);

describe("SeriesDetailsScreen", () => {
	it("renders the missing-items section below the library items", () => {
		render(<SeriesDetailsScreen />);

		const libraryItems = screen.getByTestId("series-items");
		const missingItems = screen.getByTestId("missing-series-items");

		expect(
			libraryItems.compareDocumentPosition(missingItems) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("passes the series id and type to the missing-items section", () => {
		render(<SeriesDetailsScreen />);

		const missingItems = screen.getByTestId("missing-series-items");
		expect(missingItems).toHaveAttribute(
			"data-series-id",
			String(seriesDetailsFixture.id),
		);
		expect(missingItems).toHaveAttribute(
			"data-series-type",
			seriesDetailsFixture.type,
		);
	});
});
