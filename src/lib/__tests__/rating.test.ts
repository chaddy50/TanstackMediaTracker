import { describe, expect, it } from "vitest";
import {
	formatRatingValue,
	getStarFillLevel,
	roundToNearestHalfStar,
} from "#/lib/rating";

describe("roundToNearestHalfStar", () => {
	it("snaps a 3.6 rating down to a half star", () => {
		expect(roundToNearestHalfStar(3.6)).toBe(3.5);
	});

	it("snaps a 4.4 rating up to a half star", () => {
		expect(roundToNearestHalfStar(4.4)).toBe(4.5);
	});

	it("leaves a whole rating whole", () => {
		expect(roundToNearestHalfStar(4)).toBe(4);
	});

	it("rounds up at the midpoint between two halves", () => {
		expect(roundToNearestHalfStar(3.75)).toBe(4);
	});

	it("clamps a rating below zero", () => {
		expect(roundToNearestHalfStar(-1)).toBe(0);
	});

	it("clamps a rating above five", () => {
		expect(roundToNearestHalfStar(7)).toBe(5);
	});
});

describe("getStarFillLevel", () => {
	it("fills three stars, halves the fourth and empties the fifth for 3.5", () => {
		const fillLevels = [1, 2, 3, 4, 5].map((starNumber) =>
			getStarFillLevel(starNumber, 3.5),
		);

		expect(fillLevels).toEqual(["full", "full", "full", "half", "empty"]);
	});

	it("never produces a half for a whole rating", () => {
		const fillLevels = [1, 2, 3, 4, 5].map((starNumber) =>
			getStarFillLevel(starNumber, 4),
		);

		expect(fillLevels).toEqual(["full", "full", "full", "full", "empty"]);
	});
});

describe("formatRatingValue", () => {
	it("keeps the first decimal on a whole rating", () => {
		expect(formatRatingValue(4)).toBe("4.0");
	});

	it("keeps the exact stored value of a fractional rating", () => {
		expect(formatRatingValue(3.6)).toBe("3.6");
	});

	it("hides the float noise an averaged rating carries", () => {
		expect(formatRatingValue(3.6000000000000005)).toBe("3.6");
	});

	it("formats an unrated item as zero", () => {
		expect(formatRatingValue(0)).toBe("0.0");
	});
});
