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
		<header className="px-6 py-4 border-b border-border relative flex items-center justify-between">
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
			{title && (
				<span className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
					<h1 className="text-2xl font-bold">{title}</h1>
				</span>
			)}
			<span className="flex items-center gap-2">
				{right}
				<AddMediaButton />
			</span>
		</header>
	);
}
