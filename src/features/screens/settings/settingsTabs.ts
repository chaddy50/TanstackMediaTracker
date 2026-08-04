import { DefaultsSection } from "./components/DefaultsSection";
import type { SettingsTab, SettingsTabId } from "./types";

/**
 * The editable settings panels, in the order they appear in the tab strip.
 * Adding a panel means adding an entry here, its id to `SETTINGS_TAB_IDS`, and
 * its label/description keys to the locale file — nothing else.
 */
export const SETTINGS_TABS: SettingsTab[] = [
	{
		id: "defaults",
		labelKey: "settings.defaults.title",
		descriptionKey: "settings.defaults.description",
		Component: DefaultsSection,
	},
];

export const DEFAULT_SETTINGS_TAB_ID: SettingsTabId = "defaults";

export function getSettingsTab(tabId: SettingsTabId | undefined): SettingsTab {
	const tab = SETTINGS_TABS.find((candidate) => candidate.id === tabId);
	if (tab !== undefined) {
		return tab;
	}
	return getDefaultSettingsTab();
}

// ---- Private helpers

function getDefaultSettingsTab(): SettingsTab {
	const defaultTab = SETTINGS_TABS.find(
		(candidate) => candidate.id === DEFAULT_SETTINGS_TAB_ID,
	);
	if (defaultTab === undefined) {
		throw new Error(
			`Default settings tab "${DEFAULT_SETTINGS_TAB_ID}" is not registered.`,
		);
	}
	return defaultTab;
}
