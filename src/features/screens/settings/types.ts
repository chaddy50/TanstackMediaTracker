import type { ReactElement } from "react";

export const SETTINGS_TAB_IDS = ["defaults"] as const;

export type SettingsTabId = (typeof SETTINGS_TAB_IDS)[number];

export type SettingsTab = {
	id: SettingsTabId;
	/** i18n key for the label shown in the tab strip. */
	labelKey: string;
	/** i18n key for the blurb shown above the tab's panel. */
	descriptionKey: string;
	Component: () => ReactElement;
};
