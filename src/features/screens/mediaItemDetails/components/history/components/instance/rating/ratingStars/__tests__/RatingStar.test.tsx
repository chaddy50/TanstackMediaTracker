import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RatingStar } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/ratingStars/RatingStar";

type RatingStarProps = Parameters<typeof RatingStar>[0];

function renderRatingStar(overrides: Partial<RatingStarProps> = {}) {
	const rating = overrides.rating ?? 1;
	const props: RatingStarProps = {
		starNumber: 1,
		rating,
		// Every caller but the raw-vs-rounded cases draws the rating it stores.
		roundedRating: rating,
		...overrides,
	};
	return { ...render(<RatingStar {...props} />), props };
}

function getStars(container: HTMLElement) {
	return Array.from(container.querySelectorAll("svg"));
}

/**
 * Which half of a star was clicked comes from its box, and jsdom lays nothing
 * out, so the box is stubbed and the click aimed at one side of it.
 */
function clickStarHalf(star: SVGSVGElement, half: "left" | "right") {
	const left = 100;
	const width = 20;
	star.getBoundingClientRect = () => ({ left, width }) as unknown as DOMRect;

	fireEvent.click(star, {
		clientX: half === "left" ? left + width / 4 : left + (width * 3) / 4,
	});
}

afterEach(cleanup);

describe("RatingStar", () => {
	it("renders a half star as a clipped filled overlay on an unfilled base", () => {
		const { container } = renderRatingStar({ starNumber: 4, rating: 3.5 });

		const [baseStar, overlayStar] = getStars(container);
		const overlay = overlayStar.parentElement;

		expect(screen.getByTestId("rating-star")).toHaveAttribute(
			"data-fill",
			"half",
		);
		expect(baseStar).toHaveAttribute("fill", "none");
		expect(overlayStar).toHaveAttribute("fill", "currentColor");
		expect(overlay).toHaveClass(
			"pointer-events-none",
			"absolute",
			"w-1/2",
			"overflow-hidden",
		);
		expect(overlay).toHaveAttribute("aria-hidden", "true");
	});

	it("renders a full star as a single filled star", () => {
		const { container } = renderRatingStar({ starNumber: 3, rating: 3.5 });

		const stars = getStars(container);

		expect(screen.getByTestId("rating-star")).toHaveAttribute(
			"data-fill",
			"full",
		);
		expect(stars).toHaveLength(1);
		expect(stars[0]).toHaveAttribute("fill", "currentColor");
		expect(stars[0]).toHaveClass("text-yellow-800");
	});

	it("renders an empty star as a single unfilled star", () => {
		const { container } = renderRatingStar({ starNumber: 5, rating: 3.5 });

		const stars = getStars(container);

		expect(screen.getByTestId("rating-star")).toHaveAttribute(
			"data-fill",
			"empty",
		);
		expect(stars).toHaveLength(1);
		expect(stars[0]).toHaveAttribute("fill", "none");
		expect(stars[0]).toHaveClass("text-yellow-800/30");
	});

	it("applies the caller's star size to both the base and the half overlay", () => {
		const { container } = renderRatingStar({
			starNumber: 4,
			rating: 3.5,
			className: "size-3.5",
		});

		for (const star of getStars(container)) {
			expect(star).toHaveClass("size-3.5");
		}
	});

	it("sets the whole star number when its right half is clicked", () => {
		const updateRating = vi.fn();
		const { container } = renderRatingStar({
			starNumber: 4,
			rating: 2,
			updateRating,
		});

		clickStarHalf(getStars(container)[0], "right");

		expect(updateRating).toHaveBeenCalledWith(4);
	});

	it("sets a half rating when the left half of a star is clicked", () => {
		const updateRating = vi.fn();
		const { container } = renderRatingStar({
			starNumber: 4,
			rating: 2,
			updateRating,
		});

		clickStarHalf(getStars(container)[0], "left");

		expect(updateRating).toHaveBeenCalledWith(3.5);
	});

	it("clears the rating when the star matching it is clicked", () => {
		const updateRating = vi.fn();
		const { container } = renderRatingStar({
			starNumber: 4,
			rating: 4,
			updateRating,
		});

		clickStarHalf(getStars(container)[0], "right");

		expect(updateRating).toHaveBeenCalledWith(0);
	});

	it("clears the rating when the half matching it is clicked", () => {
		const updateRating = vi.fn();
		const { container } = renderRatingStar({
			starNumber: 4,
			rating: 3.5,
			updateRating,
		});

		clickStarHalf(getStars(container)[0], "left");

		expect(updateRating).toHaveBeenCalledWith(0);
	});

	it("does not clear a half rating when the whole star is clicked", () => {
		const updateRating = vi.fn();
		const { container } = renderRatingStar({
			starNumber: 4,
			rating: 3.5,
			updateRating,
		});

		clickStarHalf(getStars(container)[0], "right");

		expect(updateRating).toHaveBeenCalledWith(4);
	});

	it("clears against the stored rating, not the one it draws", () => {
		const updateRating = vi.fn();
		const { container } = renderRatingStar({
			starNumber: 4,
			rating: 3.8,
			roundedRating: 4,
			updateRating,
		});

		clickStarHalf(getStars(container)[0], "right");

		expect(updateRating).toHaveBeenCalledWith(4);
	});

	it("renders no click affordance and ignores clicks when not editable", () => {
		const { container } = renderRatingStar({ starNumber: 1, rating: 1 });

		const [star] = getStars(container);
		fireEvent.click(star);

		expect(star).not.toHaveClass("cursor-pointer");
	});

	it("uses the dark-background palette for the half overlay", () => {
		const { container } = renderRatingStar({
			starNumber: 4,
			rating: 3.5,
			isOnDarkBackground: true,
		});

		const [, overlayStar] = getStars(container);

		expect(overlayStar).toHaveClass("text-yellow-300");
	});
});
