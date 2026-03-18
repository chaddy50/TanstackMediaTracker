import { StatusBadge } from "#/components/common/StatusBadge";
import { TooltipProvider } from "#/components/ui/tooltip";
import { MediaItemStatus } from "#/server/enums";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

function renderStatusBadge(props: {
	status: MediaItemStatus;
	completedAt?: string | null;
	expectedReleaseDate?: string | null;
}) {
	return render(
		<TooltipProvider>
			<StatusBadge {...props} />
		</TooltipProvider>,
	);
}

afterEach(cleanup);

describe("StatusBadge", () => {
	// Radix tooltip content is hover-only in jsdom; test the tooltip wrapper instead
	it("wraps badge in tooltip trigger when status is WAITING_FOR_NEXT_RELEASE with a date", () => {
		renderStatusBadge({
			status: MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
			expectedReleaseDate: "2024-06-01",
		});
		expect(screen.getByTestId("status-badge")).toHaveAttribute(
			"data-slot",
			"tooltip-trigger",
		);
	});

	it("does not wrap badge in tooltip trigger when expected release date is null", () => {
		renderStatusBadge({
			status: MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
			expectedReleaseDate: null,
		});
		expect(screen.getByTestId("status-badge")).not.toHaveAttribute(
			"data-slot",
			"tooltip-trigger",
		);
	});

	it("does not wrap badge in tooltip trigger when status is not WAITING_FOR_NEXT_RELEASE", () => {
		renderStatusBadge({
			status: MediaItemStatus.BACKLOG,
			expectedReleaseDate: "2024-06-01",
		});
		expect(screen.getByTestId("status-badge")).not.toHaveAttribute(
			"data-slot",
			"tooltip-trigger",
		);
	});

	it("shows formatted completedAt date when provided", () => {
		renderStatusBadge({
			status: MediaItemStatus.COMPLETED,
			completedAt: "2024-01-15",
		});
		expect(screen.getByText("Jan 15, 2024")).toBeInTheDocument();
	});

	it("does not show completedAt date when null", () => {
		renderStatusBadge({
			status: MediaItemStatus.COMPLETED,
			completedAt: null,
		});
		expect(screen.queryByText("Jan 15, 2024")).not.toBeInTheDocument();
	});

	it("does not show completedAt date when status is not completed", () => {
		renderStatusBadge({
			status: MediaItemStatus.BACKLOG,
			completedAt: "2024-01-15",
		});
		expect(screen.queryByText("Jan 15, 2024")).not.toBeInTheDocument();
	});
});
