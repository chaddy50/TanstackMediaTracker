import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaItemCard } from "#/components/MediaItemCard";
import { TooltipProvider } from "#/components/ui/tooltip";
import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

type BaseItem = {
	id: number;
	title: string;
	type: MediaItemType;
	coverImageUrl: string | null;
	rating: number;
	purchaseStatus: PurchaseStatus;
	status: MediaItemStatus;
	expectedReleaseDate?: string | null;
};

const baseItem: BaseItem = {
	id: 1,
	title: "Dune",
	type: MediaItemType.BOOK,
	coverImageUrl: null,
	rating: 4,
	purchaseStatus: PurchaseStatus.NOT_PURCHASED,
	status: MediaItemStatus.BACKLOG,
};

function renderMediaItemCard(
	overrides: Partial<BaseItem & { seriesName: string }> & {
		shouldShowType?: boolean;
		shouldShowRating?: boolean;
		shouldShowPurchaseStatus?: boolean;
		shouldShowStatus?: boolean;
	} = {},
) {
	const {
		shouldShowType,
		shouldShowRating,
		shouldShowPurchaseStatus,
		shouldShowStatus,
		...itemOverrides
	} = overrides;
	return render(
		<TooltipProvider>
			<MediaItemCard
				mediaItem={{ ...baseItem, ...itemOverrides }}
				shouldShowType={shouldShowType}
				shouldShowRating={shouldShowRating}
				shouldShowPurchaseStatus={shouldShowPurchaseStatus}
				shouldShowStatus={shouldShowStatus}
			/>
		</TooltipProvider>,
	);
}

const NON_BACKLOG_STATUSES = [
	MediaItemStatus.NEXT_UP,
	MediaItemStatus.IN_PROGRESS,
	MediaItemStatus.ON_HOLD,
	MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
	MediaItemStatus.COMPLETED,
	MediaItemStatus.DROPPED,
];

afterEach(cleanup);

describe("MediaItemCard", () => {
	it("shows purchased badge by default when the item is purchased", () => {
		renderMediaItemCard({ purchaseStatus: PurchaseStatus.PURCHASED });
		expect(screen.getByTestId("purchased-badge")).toBeInTheDocument();
	});

	it("does not show purchased badge by default when the item is only wanted", () => {
		renderMediaItemCard({ purchaseStatus: PurchaseStatus.WANT_TO_BUY });
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
	});

	it("does not show purchased badge by default when the item is not purchased", () => {
		renderMediaItemCard({ purchaseStatus: PurchaseStatus.NOT_PURCHASED });
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
	});

	it("shows purchased badge when explicitly enabled", () => {
		renderMediaItemCard({
			shouldShowPurchaseStatus: true,
			purchaseStatus: PurchaseStatus.PURCHASED,
		});
		expect(screen.getByTestId("purchased-badge")).toBeInTheDocument();
	});

	it("does not show purchased badge when explicitly enabled but only wanted", () => {
		renderMediaItemCard({
			shouldShowPurchaseStatus: true,
			purchaseStatus: PurchaseStatus.WANT_TO_BUY,
		});
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
	});

	it("does not show purchased badge when explicitly enabled but not purchased", () => {
		renderMediaItemCard({
			shouldShowPurchaseStatus: true,
			purchaseStatus: PurchaseStatus.NOT_PURCHASED,
		});
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
	});

	// The opt-out the dashboard relies on to keep its sections badge-free.
	it("does not show purchased badge when explicitly disabled", () => {
		renderMediaItemCard({
			shouldShowPurchaseStatus: false,
			purchaseStatus: PurchaseStatus.PURCHASED,
		});
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
	});

	it.each([
		MediaItemStatus.IN_PROGRESS,
		MediaItemStatus.ON_HOLD,
		MediaItemStatus.COMPLETED,
		MediaItemStatus.DROPPED,
	])("hides the purchased badge for %s, which implies ownership", (status) => {
		renderMediaItemCard({ status, purchaseStatus: PurchaseStatus.PURCHASED });
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
	});

	it.each([
		MediaItemStatus.BACKLOG,
		MediaItemStatus.NEXT_UP,
		MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
	])("shows the purchased badge for %s, which does not", (status) => {
		renderMediaItemCard({ status, purchaseStatus: PurchaseStatus.PURCHASED });
		expect(screen.getByTestId("purchased-badge")).toBeInTheDocument();
	});

	it("shows rating stars when status is COMPLETED", () => {
		renderMediaItemCard({ status: MediaItemStatus.COMPLETED });
		expect(screen.getByTestId("rating-stars")).toBeInTheDocument();
	});

	it("does not show rating stars when status is IN_PROGRESS", () => {
		renderMediaItemCard({ status: MediaItemStatus.IN_PROGRESS });
		expect(screen.queryByTestId("rating-stars")).not.toBeInTheDocument();
	});

	it("shows the status badge by default", () => {
		renderMediaItemCard({ status: MediaItemStatus.IN_PROGRESS });
		expect(screen.getByTestId("status-badge")).toBeInTheDocument();
	});

	it.each(NON_BACKLOG_STATUSES)("shows the status badge for %s", (status) => {
		renderMediaItemCard({ status });
		expect(screen.getByTestId("status-badge")).toBeInTheDocument();
	});

	it("shows no status badge for a backlog item", () => {
		renderMediaItemCard({ status: MediaItemStatus.BACKLOG });
		expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
	});

	// Backlog is excluded unconditionally, so it outranks the visibility flag.
	it("shows no status badge for a backlog item even when explicitly enabled", () => {
		renderMediaItemCard({
			status: MediaItemStatus.BACKLOG,
			shouldShowStatus: true,
		});
		expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
	});

	it("shows no status badge when shouldShowStatus is false", () => {
		renderMediaItemCard({
			status: MediaItemStatus.IN_PROGRESS,
			shouldShowStatus: false,
		});
		expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
	});

	it("shows the status badge when explicitly enabled", () => {
		renderMediaItemCard({
			status: MediaItemStatus.IN_PROGRESS,
			shouldShowStatus: true,
		});
		expect(screen.getByTestId("status-badge")).toBeInTheDocument();
	});

	it("renders the status badge translucent on the card", () => {
		renderMediaItemCard({ status: MediaItemStatus.IN_PROGRESS });

		const badge = screen.getByTestId("status-badge");
		expect(badge).toHaveClass("bg-black/60", "text-white", "backdrop-blur-sm");
		expect(badge).not.toHaveClass("bg-blue-600");
	});

	// The badge row is gated on a combined condition; status alone must open it.
	it("shows the status badge when it is the only badge in the row", () => {
		renderMediaItemCard({
			status: MediaItemStatus.IN_PROGRESS,
			purchaseStatus: PurchaseStatus.NOT_PURCHASED,
			shouldShowType: false,
		});
		expect(screen.getByTestId("status-badge")).toBeInTheDocument();
	});

	it("renders the status badge between the purchased and type badges", () => {
		renderMediaItemCard({
			status: MediaItemStatus.NEXT_UP,
			purchaseStatus: PurchaseStatus.PURCHASED,
		});

		const statusBadge = screen.getByTestId("status-badge");
		expect(
			statusBadge.compareDocumentPosition(
				screen.getByTestId("purchased-badge"),
			) & Node.DOCUMENT_POSITION_PRECEDING,
		).toBeTruthy();
		expect(
			statusBadge.compareDocumentPosition(screen.getByTestId("type-badge")) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("matches the icon badges' height so the row lines up", () => {
		renderMediaItemCard({ status: MediaItemStatus.IN_PROGRESS });
		expect(screen.getByTestId("status-badge")).toHaveClass(
			"h-6.5",
			"inline-flex",
			"items-center",
		);
	});

	it("wraps the status badge in a tooltip trigger for a waiting item with a date", () => {
		renderMediaItemCard({
			status: MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
			expectedReleaseDate: "2024-06-01",
		});

		const badge = screen.getByTestId("status-badge");
		expect(badge).toHaveAttribute("data-slot", "tooltip-trigger");
		expect(badge).toHaveClass("bg-black/60");
	});

	// Dashboard-shaped items omit the column entirely.
	it("renders a waiting item with no expected release date", () => {
		renderMediaItemCard({
			status: MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
		});

		const badge = screen.getByTestId("status-badge");
		expect(badge).toBeInTheDocument();
		expect(badge).not.toHaveAttribute("data-slot", "tooltip-trigger");
	});

	it("shows the status badge alongside the rating stars for a completed item", () => {
		renderMediaItemCard({ status: MediaItemStatus.COMPLETED });

		expect(screen.getByTestId("status-badge")).toBeInTheDocument();
		expect(screen.getByTestId("rating-stars")).toBeInTheDocument();
	});

	it("does not show type badge when shouldShowType is false", () => {
		renderMediaItemCard({ shouldShowType: false });
		expect(screen.queryByTestId("type-badge")).not.toBeInTheDocument();
	});

	it("does not show rating stars when shouldShowRating is false, even when status is COMPLETED", () => {
		renderMediaItemCard({
			status: MediaItemStatus.COMPLETED,
			shouldShowRating: false,
		});
		expect(screen.queryByTestId("rating-stars")).not.toBeInTheDocument();
	});

	it("does not show series name even when seriesName is provided", () => {
		renderMediaItemCard({ seriesName: "The Expanse" });
		expect(screen.queryByText("The Expanse")).not.toBeInTheDocument();
	});
});
