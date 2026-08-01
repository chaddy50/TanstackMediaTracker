import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatusBadge } from "#/components/StatusBadge";
import { TooltipProvider } from "#/components/ui/tooltip";
import { MediaItemStatus } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

function renderStatusBadge(props: {
	status: MediaItemStatus | undefined;
	expectedReleaseDate?: string | null;
	isOnDarkBackground?: boolean;
	onClick?: () => void;
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

	it("applies translucent classes when isOnDarkBackground is true", () => {
		renderStatusBadge({
			status: MediaItemStatus.IN_PROGRESS,
			isOnDarkBackground: true,
		});
		expect(screen.getByTestId("status-badge")).toHaveClass(
			"bg-black/60",
			"text-white",
			"backdrop-blur-sm",
		);
	});

	// The translucent classes replace the status color rather than stacking with it.
	it("drops the solid status color when isOnDarkBackground is true", () => {
		renderStatusBadge({
			status: MediaItemStatus.IN_PROGRESS,
			isOnDarkBackground: true,
		});
		expect(screen.getByTestId("status-badge")).not.toHaveClass("bg-blue-600");
	});

	it("keeps solid status colors when the prop is omitted", () => {
		renderStatusBadge({ status: MediaItemStatus.IN_PROGRESS });
		expect(screen.getByTestId("status-badge")).toHaveClass(
			"bg-blue-600",
			"text-blue-100",
		);
	});

	it("keeps solid status colors when isOnDarkBackground is false", () => {
		renderStatusBadge({
			status: MediaItemStatus.IN_PROGRESS,
			isOnDarkBackground: false,
		});
		expect(screen.getByTestId("status-badge")).toHaveClass("bg-blue-600");
	});

	it("applies translucent classes to the clickable variant", () => {
		renderStatusBadge({
			status: MediaItemStatus.IN_PROGRESS,
			isOnDarkBackground: true,
			onClick: vi.fn(),
		});
		expect(screen.getByTestId("status-badge")).toHaveClass("bg-black/60");
	});

	it("keeps the tooltip trigger while translucent", () => {
		renderStatusBadge({
			status: MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
			expectedReleaseDate: "2024-06-01",
			isOnDarkBackground: true,
		});

		const badge = screen.getByTestId("status-badge");
		expect(badge).toHaveAttribute("data-slot", "tooltip-trigger");
		expect(badge).toHaveClass("bg-black/60");
	});

	it("renders nothing when status is undefined", () => {
		renderStatusBadge({ status: undefined, isOnDarkBackground: true });
		expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
	});
});
