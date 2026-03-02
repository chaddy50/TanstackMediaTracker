import { useRouter } from "@tanstack/react-router";
import { PanelLeftOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "../ui/button";
import { useSidebar } from "./sidebar/Sidebar";

interface PageHeaderProps {
	shouldShowBackButton?: boolean;
	right?: React.ReactNode;
	title?: string;
}

export function PageHeader({
	shouldShowBackButton,
	right,
	title,
}: PageHeaderProps) {
	const { t } = useTranslation();
	const router = useRouter();
	const { isOpen: isSidebarOpen, toggle: toggleSidebar } = useSidebar();

	return (
		<header className="px-6 py-4 border-b border-border relative flex items-center justify-between">
			<span className="flex items-center gap-2">
				{!isSidebarOpen && (
					<Button variant="ghost" size="icon" onClick={toggleSidebar}>
						<PanelLeftOpen className="size-4" />
						<span className="sr-only">{t("nav.expandSidebar")}</span>
					</Button>
				)}
				{shouldShowBackButton && (
					<Button variant="outline" onClick={() => router.history.back()}>
						← {t("mediaItemDetails.back")}
					</Button>
				)}
			</span>
			{title && (
				<span className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
					<h1 className="text-2xl font-bold">{title}</h1>
				</span>
			)}
			<span>{right}</span>
		</header>
	);
}
