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

	it("shows the exact rating on a collapsed row", () => {
		renderSeasonReviewRow({
			isExpanded: false,
			seasonReview: { ...baseSeasonReview, rating: 3.6 },
		});

		expect(screen.getByText("3.6")).toBeInTheDocument();
	});

	it("leaves the expanded row's editable stars unnumbered", () => {
		renderSeasonReviewRow({
			isExpanded: true,
			seasonReview: { ...baseSeasonReview, rating: 3.6 },
		});

		expect(screen.getByTestId("rating-stars")).toBeInTheDocument();
		expect(screen.queryByText("3.6")).not.toBeInTheDocument();
	});

	it("renders the fiction rating categories when collapsed", () => {
		renderSeasonReviewRow({
			isExpanded: false,
			seasonReview: {
				...baseSeasonReview,
				fictionRating: {
					setting: { rating: 3 },
					character: { rating: 3 },
					plot: { rating: 3 },
					enjoyment: { rating: 3 },
					depth: { rating: 3 },
				},
			},
		});

		expect(screen.getAllByText(/^fictionRating\./)).toHaveLength(5);
	});
});
