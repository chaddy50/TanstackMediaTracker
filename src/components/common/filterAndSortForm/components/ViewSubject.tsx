import { Label } from "#/components/ui/label";
import { Toggle } from "#/components/ui/toggle";
import type { ViewSubject } from "#/db/schema";
import { useTranslation } from "react-i18next";

interface ViewSubjectChooserProps {
	subject: ViewSubject;
	onSubjectChanged: (newSubject: ViewSubject) => void;
}

export function ViewSubjectChooser({
	subject,
	onSubjectChanged,
}: ViewSubjectChooserProps) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col gap-1.5">
			<Label>{t("views.form.subject")}</Label>
			<div className="flex gap-2">
				<Toggle
					variant="outline"
					pressed={subject === "items"}
					onPressedChange={() => onSubjectChanged("items")}
				>
					{t("views.subject.items")}
				</Toggle>
				<Toggle
					variant="outline"
					pressed={subject === "series"}
					onPressedChange={() => onSubjectChanged("series")}
				>
					{t("views.subject.series")}
				</Toggle>
			</div>
		</div>
	);
}
