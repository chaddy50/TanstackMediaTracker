import { useTranslation } from "react-i18next";

import { TopBar } from "#/features/navigation/topBar/TopBar";
import { BackfillSection } from "./components/BackfillSection";
import { BackupSection } from "./components/BackupSection";
import { DefaultsSection } from "./components/DefaultsSection";
import { UserInfo } from "./components/UserInfo";

export function SettingsScreen() {
	const { t } = useTranslation();

	return (
		<div className="min-h-screen bg-background text-foreground">
			<TopBar title={t("settings.title")} />
			<main className="px-6 py-6 max-w-2xl flex flex-col gap-10">
				<UserInfo />
				<DefaultsSection />
				<BackupSection />
				<BackfillSection />
			</main>
		</div>
	);
}
