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
		platforms: Array.isArray(rawMetadata.platforms)
			? rawMetadata.platforms.join(", ")
			: "",
	});

	function updateField(key: keyof typeof fields, value: string) {
		const updated = { ...fields, [key]: value };
		setFields(updated);
		onChange({
			...rawMetadata,
			platforms: parseArrayField(updated.platforms),
		});
	}

	return (
		<FormField label={t("metadata.platforms")}>
			<Input
				value={fields.platforms}
				onChange={(e) => updateField("platforms", e.target.value)}
				placeholder="PC, PlayStation 5, ..."
			/>
		</FormField>
	);
}
