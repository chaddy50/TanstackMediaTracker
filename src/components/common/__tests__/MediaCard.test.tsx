import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaCard } from "#/components/common/MediaCard";
import { TooltipProvider } from "#/components/ui/tooltip";
import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/server/enums";

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
	completedAt: string | null;
	expectedReleaseDate: string | null;
};

const baseItem: BaseItem = {
	id: 1,
	title: "Dune",
	type: MediaItemType.BOOK,
	coverImageUrl: null,
	rating: 4,
	purchaseStatus: PurchaseStatus.NOT_PURCHASED,
	status: MediaItemStatus.BACKLOG,
	completedAt: null,
	expectedReleaseDate: null,
};

function renderMediaCard(
	overrides: Partial<BaseItem & { seriesName: string }> & {
		shouldShowStatus?: boolean;
		shouldShowType?: boolean;
		shouldShowRating?: boolean;
	} = {},
) {
	const { shouldShowStatus, shouldShowType, shouldShowRating, ...itemOverrides } = overrides;
	return render(
		<TooltipProvider>
			<MediaCard
				mediaItem={{ ...baseItem, ...itemOverrides }}
				shouldShowStatus={shouldShowStatus}
				shouldShowType={shouldShowType}
				shouldShowRating={shouldShowRating}
			/>
		</TooltipProvider>,
	);
}

afterEach(cleanup);

describe("MediaCard", () => {
	it("does not show purchased badge when status is IN_PROGRESS", () => {
		renderMediaCard({ status: MediaItemStatus.IN_PROGRESS });
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
	});

	it("shows purchased badge when status is BACKLOG", () => {
		renderMediaCard({ status: MediaItemStatus.BACKLOG });
		expect(screen.getByTestId("purchased-badge")).toBeInTheDocument();
	});

	it("shows rating stars when status is COMPLETED", () => {
		renderMediaCard({ status: MediaItemStatus.COMPLETED });
		expect(screen.getByTestId("rating-stars")).toBeInTheDocument();
	});

	it("does not show rating stars when status is IN_PROGRESS", () => {
		renderMediaCard({ status: MediaItemStatus.IN_PROGRESS });
		expect(screen.queryByTestId("rating-stars")).not.toBeInTheDocument();
	});

	it("does not show status badge when shouldShowStatus is false", () => {
		renderMediaCard({ shouldShowStatus: false });
		expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
	});

	it("does not show type badge when shouldShowType is false", () => {
		renderMediaCard({ shouldShowType: false });
		expect(screen.queryByTestId("type-badge")).not.toBeInTheDocument();
	});

	it("does not show rating stars when shouldShowRating is false, even when status is COMPLETED", () => {
		renderMediaCard({ status: MediaItemStatus.COMPLETED, shouldShowRating: false });
		expect(screen.queryByTestId("rating-stars")).not.toBeInTheDocument();
	});

	it("does not show series name even when seriesName is provided", () => {
		renderMediaCard({ seriesName: "The Expanse" });
		expect(screen.queryByText("The Expanse")).not.toBeInTheDocument();
	});
});
