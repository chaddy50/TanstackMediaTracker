import { describe, expect, it } from "vitest";

import { en } from "#/i18n/locales/en";
import { ITEM_SORT_FIELDS, SERIES_SORT_FIELDS } from "#/lib/sortFields";

const sortByOptionLabels: Record<string, string> = en.views.form.sortByOption;

describe("ITEM_SORT_FIELDS", () => {
	it("includes releaseDate", () => {
		expect(ITEM_SORT_FIELDS).toContain("releaseDate");
	});

	it("gives every item sort field an English label", () => {
		for (const field of ITEM_SORT_FIELDS) {
			expect(sortByOptionLabels[field]).toBeTruthy();
		}
	});
});

describe("SERIES_SORT_FIELDS", () => {
	it("does not include releaseDate", () => {
		expect(SERIES_SORT_FIELDS).not.toContain("releaseDate");
	});

	it("gives every series sort field an English label", () => {
		for (const field of SERIES_SORT_FIELDS) {
			expect(sortByOptionLabels[field]).toBeTruthy();
		}
	});
});

describe("sort field labels", () => {
	it('labels releaseDate as "Release date"', () => {
		expect(en.views.form.sortByOption.releaseDate).toBe("Release date");
	});
});
