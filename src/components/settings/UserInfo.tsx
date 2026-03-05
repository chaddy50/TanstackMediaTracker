import { authClient } from "@/lib/auth-client";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";

export function UserInfo() {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const user = session?.user;
	async function handleLogout() {
		await authClient.signOut();
		navigate({ to: "/login" });
	}
	return (
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
	);
}
