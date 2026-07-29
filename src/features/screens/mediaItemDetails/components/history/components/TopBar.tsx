import { useTranslation } from "react-i18next";
import { Button } from "#/components/ui/button";

interface TopBarProps {
	idBeingEdited: number | "new" | null;
	startEditing: (id: number | "new") => void;
}

export function TopBar(props: TopBarProps) {
	const { idBeingEdited, startEditing } = props;
	const { t } = useTranslation();
	return (
		<div className="flex items-center justify-between mb-4">
			<h2 className="text-lg font-semibold">{t("mediaItemDetails.history")}</h2>

			{idBeingEdited !== "new" && (
				<Button variant="outline" size="sm" onClick={() => startEditing("new")}>
					{t("mediaItemDetails.addInstance")}
				</Button>
			)}
		</div>
	);
}
