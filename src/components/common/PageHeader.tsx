import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";

interface PageHeaderProps {
	backButtonDestination?: string | undefined;
	right?: React.ReactNode;
	title?: string;
}

export function PageHeader({
	backButtonDestination,
	right,
	title,
}: PageHeaderProps) {
	const { t } = useTranslation();
	return (
		<header className="px-6 py-4 border-b border-border flex items-center justify-between">
			<span>
				{backButtonDestination && (
					<Button variant="outline">
						<Link to={backButtonDestination}>
							← {t("mediaItemDetails.backToLibrary")}
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
