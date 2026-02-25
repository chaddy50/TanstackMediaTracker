import { Link, useRouter } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";

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
	return (
		<header className="px-6 py-4 border-b border-border flex items-center justify-between">
			<span className="flex items-center gap-2">
				{shouldShowBackButton && (
					<Button variant="outline" onClick={() => router.history.back()}>
						← {t("mediaItemDetails.back")}
					</Button>
				)}
				{shouldShowBackButton && (
					<Button variant="outline" size="icon" asChild>
						<Link to="/">
							<Home />
						</Link>
					</Button>
				)}
			</span>
			<span>
				{title && <h1 className="text-2xl font-bold">{t("library.title")}</h1>}
			</span>
			{right}
		</header>
	);
}
