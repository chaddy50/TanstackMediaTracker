import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatsBar } from "#/components/StatsBar";
import type { FilterAndSortOptions } from "#/database/schema";
import { MediaItemStatus, PurchaseStatus } from "#/lib/enums";
import type { ItemStats } from "#/lib/queries/types";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

/**
 * Every field defaults to its own distinct non-zero number, so a count rendered
 * against the wrong label cannot pass by coincidence.
 */
function makeStats(overrides?: Partial<ItemStats>): ItemStats {
	return {
		totalCount: 11,
		completedCount: 22,
		purchasedCount: 44,
		droppedCount: 66,
		...overrides,
	};
}

function renderStatsBar(
	overrides?: Partial<ItemStats>,
	filters?: FilterAndSortOptions | null,
) {
	return render(<StatsBar stats={makeStats(overrides)} filters={filters} />);
}

/** Reads the count rendered alongside a label, so pairings are checked as pairs. */
function readStatValue(labelKey: string): string | null | undefined {
	return screen.getByText(labelKey).previousElementSibling?.textContent;
}

afterEach(cleanup);

describe("StatsBar", () => {
	it("renders nothing when the total is 0", () => {
		const { container } = renderStatsBar({
			totalCount: 0,
			completedCount: 0,
			purchasedCount: 0,
			droppedCount: 0,
		});

		expect(container).toBeEmptyDOMElement();
		expect(screen.queryByTestId("stats-bar")).not.toBeInTheDocument();
	});

	it("renders the bar once the total is non-zero", () => {
		renderStatsBar({ totalCount: 5 });

		expect(screen.getByTestId("stats-bar")).toBeInTheDocument();
		expect(readStatValue("stats.items")).toBe("5");
	});

	it("renders the completed and dropped counts", () => {
		renderStatsBar({
			totalCount: 6,
			completedCount: 3,
			droppedCount: 1,
		});

		expect(readStatValue("stats.completed")).toBe("3");
		expect(readStatValue("stats.dropped")).toBe("1");
	});

	it("renders the purchased count", () => {
		renderStatsBar({ purchasedCount: 4 });

		expect(readStatValue("stats.purchased")).toBe("4");
	});

	// Only the total gates visibility: a filter that matches items none of which
	// are completed, purchased or dropped still deserves its row of counts.
	it("stays visible when only the sub-counts are zero", () => {
		renderStatsBar({
			totalCount: 5,
			completedCount: 0,
			purchasedCount: 0,
			droppedCount: 0,
		});

		expect(screen.getByTestId("stats-bar")).toBeInTheDocument();
		expect(readStatValue("stats.items")).toBe("5");
		expect(readStatValue("stats.completed")).toBe("0");
		expect(readStatValue("stats.purchased")).toBe("0");
	});

	it("leaves dropped and its divider off when nothing was dropped", () => {
		renderStatsBar({ droppedCount: 0 });

		expect(screen.queryByText("stats.dropped")).not.toBeInTheDocument();
		expect(screen.getAllByTestId("stats-divider")).toHaveLength(2);
	});

	it("shows dropped and its divider once something was dropped", () => {
		renderStatsBar({ droppedCount: 1 });

		expect(readStatValue("stats.dropped")).toBe("1");
		expect(screen.getAllByTestId("stats-divider")).toHaveLength(3);
	});

	it("labels every count through t()", () => {
		renderStatsBar();

		for (const key of [
			"stats.items",
			"stats.completed",
			"stats.purchased",
			"stats.dropped",
		]) {
			expect(screen.getByText(key), key).toBeInTheDocument();
		}
	});

	// A count the filters have already settled tells the user only what they
	// themselves asked for.
	it("hides the completed count in a view of completed items", () => {
		renderStatsBar(undefined, { statuses: [MediaItemStatus.COMPLETED] });

		expect(screen.queryByText("stats.completed")).not.toBeInTheDocument();
		expect(readStatValue("stats.items")).toBe("11");
	});

	// A finished-items view is a record of what was consumed; what was paid for
	// getting there is beside the point.
	it("hides the purchased count in a view of completed items", () => {
		renderStatsBar(undefined, { statuses: [MediaItemStatus.COMPLETED] });

		expect(screen.queryByText("stats.purchased")).not.toBeInTheDocument();
	});

	it("keeps the purchased count when completed is not the only status", () => {
		renderStatsBar(undefined, {
			statuses: [MediaItemStatus.COMPLETED, MediaItemStatus.DROPPED],
		});

		expect(readStatValue("stats.purchased")).toBe("44");
	});

	it("hides the completed count when the filter leaves completed out", () => {
		renderStatsBar(undefined, { statuses: [MediaItemStatus.BACKLOG] });

		expect(screen.queryByText("stats.completed")).not.toBeInTheDocument();
	});

	it("keeps the completed count when the status filter still lets it vary", () => {
		renderStatsBar(undefined, {
			statuses: [MediaItemStatus.COMPLETED, MediaItemStatus.IN_PROGRESS],
		});

		expect(readStatValue("stats.completed")).toBe("22");
	});

	it("hides the purchased count in a view of purchased items", () => {
		renderStatsBar(undefined, {
			purchaseStatuses: [PurchaseStatus.PURCHASED],
		});

		expect(screen.queryByText("stats.purchased")).not.toBeInTheDocument();
	});

	it("hides the dropped count in a view of dropped items", () => {
		renderStatsBar(undefined, { statuses: [MediaItemStatus.DROPPED] });

		expect(screen.queryByText("stats.dropped")).not.toBeInTheDocument();
	});

	// Hiding a section takes its divider with it, so nothing is left dangling.
	it("leaves no stranded dividers when the filters settle every count", () => {
		renderStatsBar(undefined, {
			statuses: [MediaItemStatus.COMPLETED],
			purchaseStatuses: [PurchaseStatus.PURCHASED],
		});

		expect(screen.queryAllByTestId("stats-divider")).toHaveLength(0);
		expect(readStatValue("stats.items")).toBe("11");
	});

	it("shows every count when no filters are applied", () => {
		renderStatsBar();

		expect(readStatValue("stats.items")).toBe("11");
		expect(readStatValue("stats.purchased")).toBe("44");
		expect(readStatValue("stats.completed")).toBe("22");
		expect(readStatValue("stats.dropped")).toBe("66");
	});

	// The dividers carry the grouping — the total, then progress, then spending,
	// then the abandoned ones — so their placement is the layout.
	it("gives the total, completed, purchased and dropped their own sections", () => {
		renderStatsBar();

		const bar = screen.getByTestId("stats-bar");
		const contents = Array.from(bar.children).map(
			(child) => child.getAttribute("data-testid") ?? child.textContent,
		);

		expect(contents).toEqual([
			"11stats.items",
			"stats-divider",
			"44stats.purchased",
			"stats-divider",
			"22stats.completed",
			"stats-divider",
			"66stats.dropped",
		]);
	});

	it("renders dropped last", () => {
		renderStatsBar();

		const purchasedLabel = screen.getByText("stats.purchased");
		const droppedLabel = screen.getByText("stats.dropped");

		expect(
			purchasedLabel.compareDocumentPosition(droppedLabel) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});
});
