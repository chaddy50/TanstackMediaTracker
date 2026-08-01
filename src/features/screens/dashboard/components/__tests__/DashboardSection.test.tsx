import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "#/components/ui/tooltip";
import { DashboardSection } from "#/features/screens/dashboard/components/DashboardSection";
import type { DashboardItem } from "#/features/screens/dashboard/dashboard";
import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function makePurchasedItem(): DashboardItem {
	return {
		id: 1,
		status: MediaItemStatus.BACKLOG,
		purchaseStatus: PurchaseStatus.PURCHASED,
		title: "Dune",
		type: MediaItemType.BOOK,
		coverImageUrl: null,
		seriesId: null,
		seriesName: null,
		rating: 0,
	};
}

function renderDashboardSection(
	options: {
		variant?: "grid" | "scroll";
		shouldShowPurchaseStatus?: boolean;
		items?: DashboardItem[];
	} = {},
) {
	const { variant, shouldShowPurchaseStatus, items } = options;
	return render(
		<TooltipProvider>
			<DashboardSection
				title="dashboard.nextInSeries"
				items={items ?? [makePurchasedItem()]}
				emptyMessage="dashboard.emptyNextInSeries"
				variant={variant}
				shouldShowPurchaseStatus={shouldShowPurchaseStatus}
			/>
		</TooltipProvider>,
	);
}

afterEach(cleanup);

describe("DashboardSection", () => {
	// The two render branches forward the prop at separate call sites, so each
	// needs its own assertion.
	it("shows no badge by default in the grid variant", () => {
		renderDashboardSection({ variant: "grid" });
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
	});

	it("shows no badge by default in the scroll variant", () => {
		renderDashboardSection({ variant: "scroll" });
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
	});

	it("shows the badge when explicitly enabled in the scroll variant", () => {
		renderDashboardSection({
			variant: "scroll",
			shouldShowPurchaseStatus: true,
		});
		expect(screen.getByTestId("purchased-badge")).toBeInTheDocument();
	});

	it("shows the badge when explicitly enabled in the grid variant", () => {
		renderDashboardSection({ variant: "grid", shouldShowPurchaseStatus: true });
		expect(screen.getByTestId("purchased-badge")).toBeInTheDocument();
	});

	it("shows no badge when explicitly disabled", () => {
		renderDashboardSection({ shouldShowPurchaseStatus: false });
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
	});

	it("renders the empty message and no cards for an empty list", () => {
		renderDashboardSection({ items: [] });

		expect(screen.getByText("dashboard.emptyNextInSeries")).toBeInTheDocument();
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
		expect(screen.queryByTestId("type-badge")).not.toBeInTheDocument();
	});
});
