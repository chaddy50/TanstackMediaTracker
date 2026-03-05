import { PageHeader } from "#/components/common/PageHeader";
import { BackfillSection } from "#/components/settings/BackfillSection";
import { BackupSection } from "#/components/settings/BackupSection";
import { UserInfo } from "#/components/settings/UserInfo";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/_app/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const { t } = useTranslation();
	return (
		<div className="min-h-screen bg-background text-foreground">
			<PageHeader title={t("settings.title")} />
			<main className="px-6 py-6 max-w-2xl flex flex-col gap-10">
				<UserInfo />
				<BackupSection />
				<BackfillSection />
			</main>
		</div>
	);
}
