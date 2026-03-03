import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "#/components/common/PageHeader";
import { BackupSection } from "#/components/settings/BackupSection";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/_authenticated/_app/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();
	const user = session?.user;

	async function handleLogout() {
		await authClient.signOut();
		navigate({ to: "/login" });
	}

	return (
		<div className="min-h-screen bg-background text-foreground">
			<PageHeader title={t("settings.title")} />
			<main className="px-6 py-6 max-w-2xl flex flex-col gap-10">
				<section className="flex flex-col gap-4">
					<h2 className="text-lg font-semibold">{t("settings.account.title")}</h2>
					<div className="flex items-center justify-between">
						<div className="flex flex-col gap-0.5">
							<span className="font-medium">{user?.name}</span>
							<span className="text-sm text-muted-foreground">{user?.email}</span>
						</div>
						<Button variant="outline" onClick={handleLogout} className="gap-2">
							<LogOut className="size-4" />
							{t("auth.logout")}
						</Button>
					</div>
				</section>

				<BackupSection />
			</main>
		</div>
	);
}
