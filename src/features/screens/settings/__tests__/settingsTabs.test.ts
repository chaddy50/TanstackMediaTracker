import { describe, expect, it } from "vitest";
import { GenresSection } from "#/features/screens/settings/components/GenresSection";
import { TagsSection } from "#/features/screens/settings/components/TagsSection";
import {
	DEFAULT_SETTINGS_TAB_ID,
	getSettingsTab,
	SETTINGS_TABS,
} from "#/features/screens/settings/settingsTabs";
import { SETTINGS_TAB_IDS } from "#/features/screens/settings/types";

describe("SETTINGS_TABS", () => {
	it("registers exactly the ids declared in SETTINGS_TAB_IDS", () => {
		const registeredIds = SETTINGS_TABS.map((tab) => tab.id);
		expect([...registeredIds].sort()).toEqual([...SETTINGS_TAB_IDS].sort());
	});

	it("has no duplicate ids", () => {
		const registeredIds = SETTINGS_TABS.map((tab) => tab.id);
		expect(new Set(registeredIds).size).toBe(registeredIds.length);
	});

	it("gives every tab a label and description key", () => {
		for (const tab of SETTINGS_TABS) {
			expect(tab.labelKey).toBeTruthy();
			expect(tab.descriptionKey).toBeTruthy();
		}
	});
});

describe("getSettingsTab", () => {
	it("returns the tab matching the given id", () => {
		for (const tabId of SETTINGS_TAB_IDS) {
			expect(getSettingsTab(tabId).id).toBe(tabId);
		}
	});

	it("falls back to the default tab when the id is undefined", () => {
		expect(getSettingsTab(undefined).id).toBe(DEFAULT_SETTINGS_TAB_ID);
	});
});

describe("tags tab", () => {
	it("declares tags as a settings tab id", () => {
		expect([...SETTINGS_TAB_IDS]).toContain("tags");
	});

	it("resolves the tags id to the Tags panel", () => {
		const tab = getSettingsTab("tags");

		expect(tab.id).toBe("tags");
		expect(tab.Component).toBe(TagsSection);
	});

	it("still defaults to the defaults tab", () => {
		expect(getSettingsTab(undefined).id).toBe("defaults");
	});
});

describe("genres tab", () => {
	it("declares genres as a settings tab id", () => {
		expect([...SETTINGS_TAB_IDS]).toContain("genres");
	});

	it("resolves the genres id to the Genres panel", () => {
		const tab = getSettingsTab("genres");

		expect(tab.id).toBe("genres");
		expect(tab.Component).toBe(GenresSection);
	});

	it("still defaults to the defaults tab", () => {
		expect(getSettingsTab(undefined).id).toBe("defaults");
	});
});
