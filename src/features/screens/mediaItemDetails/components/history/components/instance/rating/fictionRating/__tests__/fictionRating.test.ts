import { describe, expect, it } from "vitest";
import { FICTION_RATING_FIELDS } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/fictionRating/fictionRating";

describe("FICTION_RATING_FIELDS", () => {
	it("lists the five rating categories in the declared order", () => {
		expect(FICTION_RATING_FIELDS).toEqual([
			"setting",
			"character",
			"plot",
			"enjoyment",
			"depth",
		]);
	});
});
