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
	title: "Dune",
	type: MediaItemType.BOOK,
	coverImageUrl: null,
	expectedReleaseDate: null,
	completedAt: null,
	rating: 0,
	metadata: null,
	purchaseStatus: PurchaseStatus.NOT_PURCHASED,
};

function renderInProvider(ui: React.ReactElement) {
	return render(<TooltipProvider>{ui}</TooltipProvider>);
}

/**
 * Each entry renders one of the four surfaces that pass no shouldShowStatus and
 * therefore inherit MediaItemCard's default.
 */
const SURFACES: Array<[string, (status: MediaItemStatus) => void]> = [
	[
		"GenreItems",
		(status) =>
			renderInProvider(
				<GenreItems items={[{ ...BASE_ITEM, status } as GenreItem]} />,
			),
	],
	[
		"SeriesItems",
		(status) =>
			renderInProvider(
				<SeriesItems
					items={[
						{
							...BASE_ITEM,
							status,
							creatorId: null,
							creatorName: null,
						} as SeriesItem,
					]}
				/>,
			),
	],
	[
		"CreatorItems",
		(status) =>
			renderInProvider(
				<CreatorItems items={[{ ...BASE_ITEM, status } as CreatorItem]} />,
			),
	],
	[
		"ReportDrilldownScreen",
		(status) => {
			drilldownItems = [
				{
					id: 1,
					status,
					purchaseStatus: PurchaseStatus.NOT_PURCHASED,
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

describe("status badge inheritance on non-dashboard surfaces", () => {
	it.each(SURFACES)(
		"%s shows the status badge for an in progress item",
		(_, renderSurface) => {
			renderSurface(MediaItemStatus.IN_PROGRESS);

			expect(screen.getByTestId("status-badge")).toBeInTheDocument();
		},
	);

	it.each(SURFACES)(
		"%s shows no status badge for a backlog item",
		(_, renderSurface) => {
			renderSurface(MediaItemStatus.BACKLOG);

			expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
		},
	);
});
