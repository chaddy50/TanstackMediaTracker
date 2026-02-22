import { Button } from "@/components/ui/button";
import type { SetStateAction } from "react";
import { useTranslation } from "react-i18next";

interface TopBarProps {
	idBeingEdited: number | "new" | null;
	setIdBeingEdited: (value: SetStateAction<number | "new" | null>) => void;
}

export function TopBar(props: TopBarProps) {
	const { idBeingEdited, setIdBeingEdited } = props;
	const { t } = useTranslation();
	return (
		<div className="flex items-center justify-between mb-4">
			<h2 className="text-lg font-semibold">{t("mediaItemDetails.history")}</h2>

			{idBeingEdited !== "new" && (
				<Button
					variant="outline"
					size="sm"
					onClick={() => setIdBeingEdited("new")}
				>
					{t("mediaItemDetails.addInstance")}
				</Button>
			)}
		</div>
	);
}
