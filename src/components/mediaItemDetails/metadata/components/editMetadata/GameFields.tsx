import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "#/components/ui/input";
import { FormField } from "./FormField";
import { parseArrayField } from "./parseArrayField";

interface GameFieldsProps {
	rawMetadata: Record<string, unknown>;
	onChange: (metadata: Record<string, unknown>) => void;
}

export function GameFields({ rawMetadata, onChange }: GameFieldsProps) {
	const { t } = useTranslation();
	const [fields, setFields] = useState({
		developer:
			typeof rawMetadata.developer === "string" ? rawMetadata.developer : "",
		platforms: Array.isArray(rawMetadata.platforms)
			? rawMetadata.platforms.join(", ")
			: "",
		genres: Array.isArray(rawMetadata.genres)
			? rawMetadata.genres.join(", ")
			: "",
	});

	function updateField(key: keyof typeof fields, value: string) {
		const updated = { ...fields, [key]: value };
		setFields(updated);
		onChange({
			developer: updated.developer || undefined,
			platforms: parseArrayField(updated.platforms),
			genres: parseArrayField(updated.genres),
		});
	}

	return (
		<>
			<FormField label={t("metadata.developer")}>
				<Input
					value={fields.developer}
					onChange={(e) => updateField("developer", e.target.value)}
				/>
			</FormField>

			<FormField label={t("metadata.platforms")}>
				<Input
					value={fields.platforms}
					onChange={(e) => updateField("platforms", e.target.value)}
					placeholder="PC, PlayStation 5, ..."
				/>
			</FormField>

			<FormField label={t("metadata.genres")}>
				<Input
					value={fields.genres}
					onChange={(e) => updateField("genres", e.target.value)}
					placeholder="RPG, Action, ..."
				/>
			</FormField>
		</>
	);
}
