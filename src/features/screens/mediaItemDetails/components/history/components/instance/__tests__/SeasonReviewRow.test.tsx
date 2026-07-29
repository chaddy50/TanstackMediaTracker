import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SeasonReview } from "#/database/schema";
import {
	SeasonReviewRow,
	type SeasonReviewRowProps,
} from "#/features/screens/mediaItemDetails/components/history/components/instance/SeasonReviewRow";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const baseSeasonReview: SeasonReview = {
	season: 1,
	startedAt: "",
	completedAt: "",
	rating: 0,
	reviewText: "",
};

function renderSeasonReviewRow(overrides: Partial<SeasonReviewRowProps> = {}) {
	const props: SeasonReviewRowProps = {
		seasonReview: baseSeasonReview,
		totalSeasons: undefined,
		usedSeasons: new Set<number>(),
		isExpanded: true,
		onToggleExpanded: vi.fn(),
		onChange: vi.fn(),
		onRemove: vi.fn(),
		...overrides,
	};
	return { ...render(<SeasonReviewRow {...props} />), props };
}

afterEach(cleanup);

describe("SeasonReviewRow", () => {
	it("renders an expanded row's review field as an auto-resizing box", () => {
		renderSeasonReviewRow();

		const reviewField = screen.getByLabelText("mediaItemDetails.review");
		expect(reviewField).toHaveAttribute("rows", "4");
		expect(reviewField).toHaveClass("resize-none", "field-sizing-fixed");
	});

	it("patches the parent when the season review is typed into", () => {
		const { props } = renderSeasonReviewRow();

		fireEvent.change(screen.getByLabelText("mediaItemDetails.review"), {
			target: { value: "Best season" },
		});

		expect(props.onChange).toHaveBeenCalledWith({ reviewText: "Best season" });
	});

	it("renders no textarea when collapsed", () => {
		renderSeasonReviewRow({
			isExpanded: false,
			seasonReview: { ...baseSeasonReview, reviewText: "Best season" },
		});

		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
		expect(screen.getByText("Best season")).toBeInTheDocument();
	});
});
