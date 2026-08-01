import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "#/components/ui/tooltip";
import { CreatorItems } from "#/features/screens/creatorDetails/components/CreatorItems";
import type { CreatorItem } from "#/features/screens/creatorDetails/creatorDetails";
import { GenreItems } from "#/features/screens/genreDetails/components/GenreItems";
import { ReportDrilldownScreen } from "#/features/screens/reports/ReportDrilldownScreen";
import type { DrillDownItem } from "#/features/screens/reports/types";
import { SeriesItems } from "#/features/screens/seriesDetails/components/SeriesItems";
import type { SeriesItem } from "#/features/screens/seriesDetails/seriesDetails";
import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";
import type { GenreItem } from "#/lib/genres/genres";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

let drilldownItems: DrillDownItem[] = [];

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	getRouteApi: () => ({
		useLoaderData: () => drilldownItems,
		useSearch: () => ({ key: "2026-01" }),
	}),
}));

vi.mock("#/features/navigation/topBar/TopBar", () => ({ TopBar: () => null }));

const BASE_ITEM = {
	id: 1,
	status: MediaItemStatus.BACKLOG,
	title: "Dune",
	type: MediaItemType.BOOK,
	coverImageUrl: null,
	expectedReleaseDate: null,
	completedAt: null,
	rating: 0,
	metadata: null,
};

function renderInProvider(ui: React.ReactElement) {
	return render(<TooltipProvider>{ui}</TooltipProvider>);
}

/**
 * Each entry renders one of the four surfaces that inherit MediaItemCard's
 * default rather than passing the prop themselves.
 */
const SURFACES: Array<[string, (purchaseStatus: PurchaseStatus) => void]> = [
	[
		"GenreItems",
		(purchaseStatus) =>
			renderInProvider(
				<GenreItems items={[{ ...BASE_ITEM, purchaseStatus } as GenreItem]} />,
			),
	],
	[
		"SeriesItems",
		(purchaseStatus) =>
			renderInProvider(
				<SeriesItems
					items={[
						{
							...BASE_ITEM,
							purchaseStatus,
							creatorId: null,
							creatorName: null,
						} as SeriesItem,
					]}
				/>,
			),
	],
	[
		"CreatorItems",
		(purchaseStatus) =>
			renderInProvider(
				<CreatorItems
					items={[{ ...BASE_ITEM, purchaseStatus } as CreatorItem]}
				/>,
			),
	],
	[
		"ReportDrilldownScreen",
		(purchaseStatus) => {
			drilldownItems = [
				{
					id: 1,
					status: MediaItemStatus.BACKLOG,
					purchaseStatus,
					title: "Dune",
					type: MediaItemType.BOOK,
					coverImageUrl: null,
					rating: 0,
					completedAt: null,
					expectedReleaseDate: null,
					seriesId: null,
					seriesName: null,
				},
			];
			renderInProvider(<ReportDrilldownScreen />);
		},
	],
];

afterEach(() => {
	cleanup();
	drilldownItems = [];
});

describe("purchase badge inheritance on non-dashboard surfaces", () => {
	it.each(SURFACES)(
		"%s shows the badge for a purchased item",
		(_, renderSurface) => {
			renderSurface(PurchaseStatus.PURCHASED);

			expect(screen.getByTestId("purchased-badge")).toBeInTheDocument();
		},
	);

	it.each(SURFACES)(
		"%s shows no badge for a want to buy item",
		(_, renderSurface) => {
			renderSurface(PurchaseStatus.WANT_TO_BUY);

			expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
		},
	);
});
