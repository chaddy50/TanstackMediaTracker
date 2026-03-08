import { useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Home } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "../ui/button";
import { AddMediaButton } from "./AddMediaButton";

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
	const navigate = useNavigate();

	return (
		<header className="px-3 py-2 md:px-6 md:py-4 border-b border-border sticky top-0 z-10 bg-background grid grid-cols-[auto_1fr_auto] items-center gap-2">
			<span className="flex items-center gap-1">
				{shouldShowBackButton && (
					<>
						<Button
							variant="outline"
							size="icon"
							onClick={() => router.history.back()}
						>
							<ArrowLeft className="size-4" />
							<span className="sr-only">{t("nav.back")}</span>
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() => navigate({ to: "/" })}
						>
							<Home className="size-4" />
							<span className="sr-only">{t("nav.home")}</span>
						</Button>
					</>
				)}
			</span>
			{title ? (
				<span className="flex justify-center min-w-0 pointer-events-none">
					<h1 className="text-xl md:text-2xl font-bold truncate">{title}</h1>
				</span>
			) : (
				<span />
			)}
			<span className="flex items-center gap-1 md:gap-2 justify-end">
				{right}
				<AddMediaButton />
			</span>
		</header>
	);
}
