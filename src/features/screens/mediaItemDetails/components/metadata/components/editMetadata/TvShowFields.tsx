import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "#/components/ui/input";
import { FormField } from "./FormField";

interface TvShowFieldsProps {
	rawMetadata: Record<string, unknown>;
	onChange: (metadata: Record<string, unknown>) => void;
}

export function TvShowFields({ rawMetadata, onChange }: TvShowFieldsProps) {
	const { t } = useTranslation();
	const [fields, setFields] = useState({
		seasons:
			typeof rawMetadata.seasons === "number"
				? String(rawMetadata.seasons)
				: "",
	});

	function updateField(key: keyof typeof fields, value: string) {
		const updated = { ...fields, [key]: value };
		setFields(updated);
		onChange({
			...rawMetadata,
			seasons: updated.seasons ? parseInt(updated.seasons, 10) : undefined,
		});
	}

	return (
		<FormField label={t("metadata.seasons")}>
			<Input
				type="number"
				value={fields.seasons}
				onChange={(e) => updateField("seasons", e.target.value)}
			/>
		</FormField>
	);
}
