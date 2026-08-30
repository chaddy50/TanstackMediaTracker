import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FictionRating } from "#/database/schema";
import { FictionRatingComments } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/fictionRating/FictionRatingComments";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

const CANONICAL_CATEGORY_LABELS = [
	"fictionRating.setting",
	"fictionRating.character",
	"fictionRating.plot",
	"fictionRating.enjoyment",
	"fictionRating.depth",
];

describe("FictionRatingComments", () => {
	it("renders the categories in the canonical order when the stored key order differs", () => {
		render(
			<FictionRatingComments
				// The key order a fiction rating comes back in from its jsonb column.
				fictionRating={{
					plot: { rating: 5 },
					depth: { rating: 4 },
					setting: { rating: 3 },
					character: { rating: 2 },
					enjoyment: { rating: 1 },
				}}
			/>,
		);

		expect(getRenderedCategoryLabels()).toEqual(CANONICAL_CATEGORY_LABELS);
	});

	it("renders the categories in the canonical order when the stored key order already matches", () => {
		render(
			<FictionRatingComments
				fictionRating={{
					setting: { rating: 3 },
					character: { rating: 2 },
					plot: { rating: 5 },
					enjoyment: { rating: 1 },
					depth: { rating: 4 },
				}}
			/>,
		);

		expect(getRenderedCategoryLabels()).toEqual(CANONICAL_CATEGORY_LABELS);
	});

	it("pairs each category with its own comment", () => {
		render(
			<FictionRatingComments
				fictionRating={buildFictionRating({
					setting: { rating: 3, comment: "Vivid" },
					character: { rating: 3, comment: "Thin" },
					plot: { rating: 3, comment: "Twisty" },
					enjoyment: { rating: 3, comment: "A slog" },
					depth: { rating: 3, comment: "Thoughtful" },
				})}
			/>,
		);

		expect(getCategoryRow("setting")).toHaveTextContent("Vivid");
		expect(getCategoryRow("character")).toHaveTextContent("Thin");
		expect(getCategoryRow("plot")).toHaveTextContent("Twisty");
		expect(getCategoryRow("enjoyment")).toHaveTextContent("A slog");
		expect(getCategoryRow("depth")).toHaveTextContent("Thoughtful");
	});

	it("omits the comment for a category that has none", () => {
		render(
			<FictionRatingComments
				fictionRating={buildFictionRating({
					plot: { rating: 3, comment: "Twisty" },
					depth: { rating: 3 },
				})}
			/>,
		);

		expect(getCategoryRow("depth").textContent).toBe("fictionRating.depth");
		expect(getCategoryRow("plot")).toHaveTextContent("Twisty");
	});

	it("renders a star row for every category, including unrated ones", () => {
		render(
			<FictionRatingComments
				fictionRating={buildFictionRating({ depth: { rating: 0 } })}
			/>,
		);

		expect(screen.getAllByTestId("rating-stars")).toHaveLength(5);
	});
});

function buildFictionRating(
	overrides: Partial<FictionRating> = {},
): FictionRating {
	return {
		setting: { rating: 3 },
		character: { rating: 3 },
		plot: { rating: 3 },
		enjoyment: { rating: 3 },
		depth: { rating: 3 },
		...overrides,
	};
}

function getRenderedCategoryLabels() {
	return screen
		.getAllByText(/^fictionRating\./)
		.map((label) => label.textContent);
}

function getCategoryRow(category: keyof FictionRating) {
	const row = screen
		.getByText(`fictionRating.${category}`)
		.closest("div.flex-col");
	if (!row) {
		throw new Error(`No row was rendered for the ${category} category`);
	}
	return row;
}
