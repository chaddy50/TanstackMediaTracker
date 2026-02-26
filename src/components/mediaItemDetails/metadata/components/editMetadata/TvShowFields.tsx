import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "#/components/ui/input";
import { FormField } from "./FormField";
import { parseArrayField } from "./parseArrayField";

interface TvShowFieldsProps {
	rawMetadata: Record<string, unknown>;
	onChange: (metadata: Record<string, unknown>) => void;
}

export function TvShowFields({ rawMetadata, onChange }: TvShowFieldsProps) {
	const { t } = useTranslation();
	const [fields, setFields] = useState({
		creator:
			typeof rawMetadata.creator === "string" ? rawMetadata.creator : "",
		seasons:
			typeof rawMetadata.seasons === "number"
				? String(rawMetadata.seasons)
				: "",
		genres: Array.isArray(rawMetadata.genres)
			? rawMetadata.genres.join(", ")
			: "",
	});

	function updateField(key: keyof typeof fields, value: string) {
		const updated = { ...fields, [key]: value };
		setFields(updated);
		onChange({
			creator: updated.creator || undefined,
			seasons: updated.seasons ? parseInt(updated.seasons, 10) : undefined,
			genres: parseArrayField(updated.genres),
		});
	}

	return (
		<>
			<FormField label={t("metadata.creator")}>
				<Input
					value={fields.creator}
					onChange={(e) => updateField("creator", e.target.value)}
				/>
			</FormField>

			<FormField label={t("metadata.seasons")}>
				<Input
					type="number"
					value={fields.seasons}
					onChange={(e) => updateField("seasons", e.target.value)}
				/>
			</FormField>

			<FormField label={t("metadata.genres")}>
				<Input
					value={fields.genres}
					onChange={(e) => updateField("genres", e.target.value)}
					placeholder="Drama, Comedy, ..."
				/>
			</FormField>
		</>
	);
}
