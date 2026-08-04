import { useTranslation } from "react-i18next";
import { cn } from "#/lib/utils";
import { SETTINGS_TABS } from "../settingsTabs";
import type { SettingsTabId } from "../types";

type SettingsTabStripProps = {
	activeTabId: SettingsTabId;
	onSelect: (tabId: SettingsTabId) => void;
};

export function SettingsTabStrip({
	activeTabId,
	onSelect,
}: SettingsTabStripProps) {
	const { t } = useTranslation();

	return (
		<div
			role="tablist"
			aria-label={t("settings.tabsLabel")}
			className="flex flex-wrap items-center gap-1 border-b border-border"
		>
			{SETTINGS_TABS.map((tab) => {
				const isActive = tab.id === activeTabId;
				return (
					<button
						key={tab.id}
						type="button"
						role="tab"
						id={`settings-tab-${tab.id}`}
						aria-selected={isActive}
						aria-controls={`settings-panel-${tab.id}`}
						onClick={() => onSelect(tab.id)}
						className={cn(
							"-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-t-md",
							isActive
								? "border-foreground text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground",
						)}
					>
						{t(tab.labelKey as never)}
					</button>
				);
			})}
		</div>
	);
}
