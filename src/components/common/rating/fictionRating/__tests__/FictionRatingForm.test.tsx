import { FictionRatingForm } from "#/components/common/rating/fictionRating/FictionRatingForm";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
});
