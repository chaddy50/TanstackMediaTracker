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
	} = {},
) {
	const {
		shouldShowType,
		shouldShowRating,
		shouldShowPurchaseStatus,
		...itemOverrides
	} = overrides;
	return render(
		<TooltipProvider>
			<MediaItemCard
				mediaItem={{ ...baseItem, ...itemOverrides }}
				shouldShowType={shouldShowType}
				shouldShowRating={shouldShowRating}
				shouldShowPurchaseStatus={shouldShowPurchaseStatus}
			/>
		</TooltipProvider>,
	);
}

afterEach(cleanup);

describe("MediaItemCard", () => {
	it("does not show purchased badge by default", () => {
		renderMediaItemCard({ purchaseStatus: PurchaseStatus.PURCHASED });
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
	});

	it("shows purchased badge when the item is purchased", () => {
		renderMediaItemCard({
			shouldShowPurchaseStatus: true,
			purchaseStatus: PurchaseStatus.PURCHASED,
		});
		expect(screen.getByTestId("purchased-badge")).toBeInTheDocument();
	});

	it("does not show purchased badge when the item is only wanted", () => {
		renderMediaItemCard({
			shouldShowPurchaseStatus: true,
			purchaseStatus: PurchaseStatus.WANT_TO_BUY,
		});
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
	});

	it("does not show purchased badge when the item is not purchased", () => {
		renderMediaItemCard({
			shouldShowPurchaseStatus: true,
			purchaseStatus: PurchaseStatus.NOT_PURCHASED,
		});
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
	});

	it("shows rating stars when status is COMPLETED", () => {
		renderMediaItemCard({ status: MediaItemStatus.COMPLETED });
		expect(screen.getByTestId("rating-stars")).toBeInTheDocument();
	});

	it("does not show rating stars when status is IN_PROGRESS", () => {
		renderMediaItemCard({ status: MediaItemStatus.IN_PROGRESS });
		expect(screen.queryByTestId("rating-stars")).not.toBeInTheDocument();
	});

	it("never shows a status badge", () => {
		renderMediaItemCard({ status: MediaItemStatus.IN_PROGRESS });
		expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
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
