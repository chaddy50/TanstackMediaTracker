import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { type Dispatch, type SetStateAction, useId } from "react";
import { useTranslation } from "react-i18next";

type ViewNameProps = {
	name: string;
	setName: Dispatch<SetStateAction<string>>;
};

export function ViewName({ name, setName }: ViewNameProps) {
	const { t } = useTranslation();
	const nameInputId = useId();

	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor={nameInputId}>{t("views.form.name")}</Label>
			<Input
				id={nameInputId}
				value={name}
				onChange={(e) => setName(e.target.value)}
				placeholder={t("views.form.namePlaceholder")}
			/>
		</div>
	);
}
