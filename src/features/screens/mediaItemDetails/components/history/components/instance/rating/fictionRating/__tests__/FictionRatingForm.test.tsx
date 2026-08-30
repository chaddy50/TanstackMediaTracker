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
