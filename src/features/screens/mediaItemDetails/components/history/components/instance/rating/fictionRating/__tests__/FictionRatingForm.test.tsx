import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FictionRatingForm } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/fictionRating/FictionRatingForm";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

describe("FictionRatingForm", () => {
	it("calls updateRating with the average of the five sub-ratings on mount", () => {
		const updateRating = vi.fn();
		const updateFictionRating = vi.fn();

		render(
			<FictionRatingForm
				initialValue={{
					setting: { rating: 4 },
					character: { rating: 2 },
					plot: { rating: 5 },
					enjoyment: { rating: 3 },
					depth: { rating: 1 },
				}}
				updateRating={updateRating}
				updateFictionRating={updateFictionRating}
			/>,
		);

		// (4 + 2 + 5 + 3 + 1) / 5 = 3
		expect(updateRating).toHaveBeenCalledWith(3);
	});

	it("does not call updateRating when any sub-rating is zero", () => {
		const updateRating = vi.fn();
		const updateFictionRating = vi.fn();

		render(
			<FictionRatingForm
				initialValue={{
					setting: { rating: 4 },
					character: { rating: 0 },
					plot: { rating: 5 },
					enjoyment: { rating: 3 },
					depth: { rating: 1 },
				}}
				updateRating={updateRating}
				updateFictionRating={updateFictionRating}
			/>,
		);

		expect(updateRating).not.toHaveBeenCalled();
	});

	it("renders the rating rows in the canonical category order", () => {
		render(
			<FictionRatingForm
				initialValue={{
					setting: { rating: 4 },
					character: { rating: 2 },
					plot: { rating: 5 },
					enjoyment: { rating: 3 },
					depth: { rating: 1 },
				}}
				updateRating={vi.fn()}
				updateFictionRating={vi.fn()}
			/>,
		);

		const categoryLabels = screen
			.getAllByText(/^fictionRating\./)
			.map((label) => label.textContent)
			.filter((text) => text !== "fictionRating.addComment");

		expect(categoryLabels).toEqual([
			"fictionRating.setting",
			"fictionRating.character",
			"fictionRating.plot",
			"fictionRating.enjoyment",
			"fictionRating.depth",
		]);
	});
});

describe("FictionRatingForm overall rating rounding", () => {
	it("rounds the five-field average to one decimal", () => {
		const updateRating = vi.fn();

		render(
			<FictionRatingForm
				initialValue={{
					setting: { rating: 4 },
					character: { rating: 4 },
					plot: { rating: 3 },
					enjoyment: { rating: 4 },
					depth: { rating: 3 },
				}}
				updateRating={updateRating}
				updateFictionRating={vi.fn()}
			/>,
		);

		// (4 + 4 + 3 + 4 + 3) / 5 = 3.6
		expect(updateRating).toHaveBeenCalledWith(3.6);
	});

	it("rounds an average that lands above a half", () => {
		const updateRating = vi.fn();

		render(
			<FictionRatingForm
				initialValue={{
					setting: { rating: 5 },
					character: { rating: 4 },
					plot: { rating: 4 },
					enjoyment: { rating: 4 },
					depth: { rating: 5 },
				}}
				updateRating={updateRating}
				updateFictionRating={vi.fn()}
			/>,
		);

		// (5 + 4 + 4 + 4 + 5) / 5 = 4.4
		expect(updateRating).toHaveBeenCalledWith(4.4);
	});

	it("leaves a whole average whole", () => {
		const updateRating = vi.fn();

		render(
			<FictionRatingForm
				initialValue={{
					setting: { rating: 4 },
					character: { rating: 4 },
					plot: { rating: 4 },
					enjoyment: { rating: 4 },
					depth: { rating: 4 },
				}}
				updateRating={updateRating}
				updateFictionRating={vi.fn()}
			/>,
		);

		expect(updateRating).toHaveBeenCalledWith(4);
	});
});
