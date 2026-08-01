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

function makeInProgressItem(): DashboardItem {
	return { ...makePurchasedItem(), status: MediaItemStatus.IN_PROGRESS };
}

const NON_BACKLOG_STATUSES = [
	MediaItemStatus.NEXT_UP,
	MediaItemStatus.IN_PROGRESS,
	MediaItemStatus.ON_HOLD,
	MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
	MediaItemStatus.COMPLETED,
	MediaItemStatus.DROPPED,
];

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

describe("DashboardSection status badge exception", () => {
	it("shows no status badge in the grid variant", () => {
		renderDashboardSection({ variant: "grid", items: [makeInProgressItem()] });
		expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
	});

	// The two branches forward at separate call sites.
	it("shows no status badge in the scroll variant", () => {
		renderDashboardSection({
			variant: "scroll",
			items: [makeInProgressItem()],
		});
		expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
	});

	it("shows no status badge even when purchase badges are enabled", () => {
		renderDashboardSection({
			shouldShowPurchaseStatus: true,
			items: [{ ...makePurchasedItem(), status: MediaItemStatus.NEXT_UP }],
		});

		expect(screen.getByTestId("purchased-badge")).toBeInTheDocument();
		expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
	});

	it.each(NON_BACKLOG_STATUSES)("shows no status badge for %s", (status) => {
		renderDashboardSection({
			variant: "grid",
			items: [{ ...makePurchasedItem(), status }],
		});
		expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
	});
});
