import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RatingStars } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/ratingStars/RatingStars";

// Unlike the sibling suites, this one needs `t` to interpolate: the accessible
// label is what carries the exact rating.
vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, options?: Record<string, unknown>) =>
			options ? `${key}:${options.rating}` : key,
	}),
}));

type RatingStarsProps = Parameters<typeof RatingStars>[0];

function renderRatingStars(overrides: Partial<RatingStarsProps> = {}) {
	const props: RatingStarsProps = { rating: 0, ...overrides };
	return { ...render(<RatingStars {...props} />), props };
}

function getFillLevels() {
	return screen
		.getAllByTestId("rating-star")
		.map((star) => star.getAttribute("data-fill"));
}

/**
 * Which half of a star was clicked comes from its box, and jsdom lays nothing
 * out, so the box is stubbed and the click aimed at one side of it.
 */
function clickStarHalf(starNumber: number, half: "left" | "right") {
	const stars = screen.getAllByTestId("rating-star");
	const star = stars[starNumber - 1].querySelector("svg") as SVGSVGElement;
	const left = 100;
	const width = 20;
	star.getBoundingClientRect = () => ({ left, width }) as unknown as DOMRect;

	fireEvent.click(star, {
		clientX: half === "left" ? left + width / 4 : left + (width * 3) / 4,
	});
}

afterEach(cleanup);

describe("RatingStars", () => {
	it("draws three and a half stars for a 3.6 rating", () => {
		renderRatingStars({ rating: 3.6 });

		expect(getFillLevels()).toEqual(["full", "full", "full", "half", "empty"]);
	});

	it("draws four and a half stars for a 4.4 rating", () => {
		renderRatingStars({ rating: 4.4 });

		expect(getFillLevels()).toEqual(["full", "full", "full", "full", "half"]);
	});

	it("shows the exact stored value rather than the rounded one", () => {
		renderRatingStars({ rating: 3.6, shouldShowValue: true });

		expect(screen.getByText("3.6")).toBeInTheDocument();
		expect(screen.queryByText("3.5")).not.toBeInTheDocument();
	});

	it("omits the numeric value by default", () => {
		renderRatingStars({ rating: 3.6 });

		expect(screen.queryByText("3.6")).not.toBeInTheDocument();
	});

	it("omits the numeric value for an unrated item", () => {
		renderRatingStars({
			rating: 0,
			shouldShowValue: true,
			shouldShowIfNoRating: true,
		});

		expect(screen.getByTestId("rating-stars")).toBeInTheDocument();
		expect(screen.queryByText("0")).not.toBeInTheDocument();
	});

	it("renders nothing for an unrated item by default", () => {
		renderRatingStars({ rating: 0 });

		expect(screen.queryByTestId("rating-stars")).not.toBeInTheDocument();
	});

	it("renders five empty stars for an unrated item when asked to", () => {
		renderRatingStars({ rating: 0, shouldShowIfNoRating: true });

		expect(getFillLevels()).toEqual([
			"empty",
			"empty",
			"empty",
			"empty",
			"empty",
		]);
	});

	it("always renders five stars", () => {
		renderRatingStars({ rating: 2 });

		expect(screen.getAllByTestId("rating-star")).toHaveLength(5);
	});

	it("labels the stars with the exact rating for assistive tech", () => {
		renderRatingStars({ rating: 3.6 });

		const stars = screen.getByTestId("rating-stars");

		expect(stars).toHaveAttribute("aria-label", "rating.outOfFive:3.6");
		expect(stars).toHaveAttribute("title", "rating.outOfFive:3.6");
	});

	it("keeps the container test id and merges the caller's class", () => {
		renderRatingStars({ rating: 2, className: "justify-center" });

		expect(screen.getByTestId("rating-stars")).toHaveClass("justify-center");
	});

	it("sets a whole rating when a stored 3.8 is drawn as four full stars", () => {
		const updateRating = vi.fn();
		renderRatingStars({ rating: 3.8, updateRating });

		clickStarHalf(4, "right");

		expect(updateRating).toHaveBeenCalledWith(4);
	});

	it("clears the rating when the star matching the stored value is clicked", () => {
		const updateRating = vi.fn();
		renderRatingStars({ rating: 4, updateRating });

		clickStarHalf(4, "right");

		expect(updateRating).toHaveBeenCalledWith(0);
	});

	it("records a half rating from the left side of a star", () => {
		const updateRating = vi.fn();
		renderRatingStars({ rating: 2, updateRating });

		clickStarHalf(4, "left");

		expect(updateRating).toHaveBeenCalledWith(3.5);
	});

	it("forwards the update handler to each star", () => {
		const updateRating = vi.fn();
		renderRatingStars({ rating: 2, updateRating });

		clickStarHalf(5, "right");

		expect(updateRating).toHaveBeenCalledWith(5);
	});
});
