export const MAXIMUM_RATING = 5;

export type StarFillLevel = "full" | "half" | "empty";

/**
 * Snaps a stored rating to the nearest half star. Ratings are stored to one
 * decimal, but a half is the finest granularity the stars can draw, so this is
 * the one place that decides how a `3.6` becomes three and a half stars.
 */
export function roundToNearestHalfStar(rating: number): number {
	const halfRoundedRating = Math.round(rating * 2) / 2;
	return clamp(halfRoundedRating, 0, MAXIMUM_RATING);
}

/**
 * How much of a star a rating fills, for a 1-indexed star number. Expects a
 * rating that has already been through `roundToNearestHalfStar`.
 */
export function getStarFillLevel(
	starNumber: number,
	roundedRating: number,
): StarFillLevel {
	if (starNumber <= roundedRating) {
		return "full";
	}
	if (starNumber - 0.5 === roundedRating) {
		return "half";
	}
	return "empty";
}

/**
 * A rating as display text, always to one decimal — `4.0` reads as a deliberate
 * rating next to a `3.6` rather than a differently-shaped number. Fixing the
 * decimal also hides the float noise an averaged rating carries.
 */
export function formatRatingValue(rating: number): string {
	return rating.toFixed(1);
}

// ---- Private helpers

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(Math.max(value, minimum), maximum);
}
