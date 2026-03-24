import { describe, expect, it } from "vitest";
import { applyLibrarySortDefaults, applySeriesSortDefaults } from "#/server/settings";
import type { UserSettings } from "#/db/schema";

describe("applyLibrarySortDefaults", () => {
	it("uses hardcoded defaults when settings is null", () => {
		const result = applyLibrarySortDefaults({}, null);
		expect(result.sortBy).toBe("series");
		expect(result.sortDirection).toBe("asc");
	});

	it("uses settings values when set", () => {
		const settings = {
			defaultLibrarySortBy: "title",
			defaultLibrarySortDirection: "desc",
		} as UserSettings;
		const result = applyLibrarySortDefaults({}, settings);
		expect(result.sortBy).toBe("title");
		expect(result.sortDirection).toBe("desc");
	});

	it("falls back to hardcoded default when only sortBy is set in settings", () => {
		const settings = {
			defaultLibrarySortBy: "rating",
			defaultLibrarySortDirection: null,
		} as unknown as UserSettings;
		const result = applyLibrarySortDefaults({}, settings);
		expect(result.sortBy).toBe("rating");
		expect(result.sortDirection).toBe("asc");
	});

	it("URL param sortBy overrides settings default", () => {
		const settings = {
			defaultLibrarySortBy: "title",
			defaultLibrarySortDirection: "desc",
		} as UserSettings;
		const result = applyLibrarySortDefaults({ sortBy: "rating" }, settings);
		expect(result.sortBy).toBe("rating");
	});

	it("URL param sortDirection overrides settings default", () => {
		const settings = {
			defaultLibrarySortBy: "title",
			defaultLibrarySortDirection: "desc",
		} as UserSettings;
		const result = applyLibrarySortDefaults({ sortDirection: "asc" }, settings);
		expect(result.sortDirection).toBe("asc");
	});

	it("preserves other search fields unchanged", () => {
		const result = applyLibrarySortDefaults(
			{ statuses: ["done"], mediaTypes: ["book"] },
			null,
		);
		expect(result.statuses).toEqual(["done"]);
		expect(result.mediaTypes).toEqual(["book"]);
	});
});

describe("applySeriesSortDefaults", () => {
	it("uses hardcoded defaults when settings is null", () => {
		const result = applySeriesSortDefaults({}, null);
		expect(result.sortBy).toBe("name");
		expect(result.sortDirection).toBe("asc");
	});

	it("uses settings values when set", () => {
		const settings = {
			defaultSeriesSortBy: "rating",
			defaultSeriesSortDirection: "desc",
		} as UserSettings;
		const result = applySeriesSortDefaults({}, settings);
		expect(result.sortBy).toBe("rating");
		expect(result.sortDirection).toBe("desc");
	});

	it("falls back to hardcoded default when only sortBy is set in settings", () => {
		const settings = {
			defaultSeriesSortBy: "itemCount",
			defaultSeriesSortDirection: null,
		} as unknown as UserSettings;
		const result = applySeriesSortDefaults({}, settings);
		expect(result.sortBy).toBe("itemCount");
		expect(result.sortDirection).toBe("asc");
	});

	it("URL param overrides settings default", () => {
		const settings = {
			defaultSeriesSortBy: "rating",
			defaultSeriesSortDirection: "desc",
		} as UserSettings;
		const result = applySeriesSortDefaults({ sortBy: "name", sortDirection: "asc" }, settings);
		expect(result.sortBy).toBe("name");
		expect(result.sortDirection).toBe("asc");
	});
});
