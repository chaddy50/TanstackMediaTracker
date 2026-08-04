import { describe, expect, it } from "vitest";

import { en } from "#/i18n/locales/en";
import {
	CUSTOM_ITEM_SORT_FIELD,
	ITEM_SORT_FIELDS,
	SERIES_SORT_FIELDS,
	VIEW_ITEM_SORT_FIELDS,
} from "#/lib/sortFields";

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

	// Custom order is keyed on a view id, and the library screen has none.
	it("does not include custom", () => {
		expect(ITEM_SORT_FIELDS).not.toContain("custom");
	});
});

describe("CUSTOM_ITEM_SORT_FIELD", () => {
	it('is "custom"', () => {
		expect(CUSTOM_ITEM_SORT_FIELD).toBe("custom");
	});
});

describe("VIEW_ITEM_SORT_FIELDS", () => {
	it("includes custom", () => {
		expect(VIEW_ITEM_SORT_FIELDS).toContain("custom");
	});

	it("is every item sort field followed by custom", () => {
		expect(VIEW_ITEM_SORT_FIELDS.slice(0, -1)).toEqual([...ITEM_SORT_FIELDS]);
		expect(VIEW_ITEM_SORT_FIELDS.at(-1)).toBe("custom");
	});

	it("gives every view item sort field an English label", () => {
		for (const field of VIEW_ITEM_SORT_FIELDS) {
			expect(sortByOptionLabels[field]).toBeTruthy();
		}
	});
});

describe("SERIES_SORT_FIELDS", () => {
	it("does not include releaseDate", () => {
		expect(SERIES_SORT_FIELDS).not.toContain("releaseDate");
	});

	it("does not include custom", () => {
		expect(SERIES_SORT_FIELDS).not.toContain("custom");
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
