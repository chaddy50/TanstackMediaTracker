import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatusBadge } from "#/components/StatusBadge";
import { TooltipProvider } from "#/components/ui/tooltip";
import { MediaItemStatus } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

function renderStatusBadge(props: {
	status: MediaItemStatus;
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
});
