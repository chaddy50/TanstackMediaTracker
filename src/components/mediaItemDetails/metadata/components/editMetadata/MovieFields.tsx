import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "#/components/ui/input";
import { FormField } from "./FormField";
import { parseArrayField } from "./parseArrayField";

interface MovieFieldsProps {
	rawMetadata: Record<string, unknown>;
	onChange: (metadata: Record<string, unknown>) => void;
}

export function MovieFields({ rawMetadata, onChange }: MovieFieldsProps) {
	const { t } = useTranslation();
	const [fields, setFields] = useState({
		director:
			typeof rawMetadata.director === "string" ? rawMetadata.director : "",
		runtime:
			typeof rawMetadata.runtime === "number"
				? String(rawMetadata.runtime)
				: "",
		genres: Array.isArray(rawMetadata.genres)
			? rawMetadata.genres.join(", ")
			: "",
	});

	function updateField(key: keyof typeof fields, value: string) {
		const updated = { ...fields, [key]: value };
		setFields(updated);
		onChange({
			director: updated.director || undefined,
			runtime: updated.runtime ? parseInt(updated.runtime, 10) : undefined,
			genres: parseArrayField(updated.genres),
		});
	}

	return (
		<>
			<FormField label={t("metadata.director")}>
				<Input
					value={fields.director}
					onChange={(e) => updateField("director", e.target.value)}
				/>
			</FormField>

			<FormField label={t("metadata.runtime")}>
				<Input
					type="number"
					value={fields.runtime}
					onChange={(e) => updateField("runtime", e.target.value)}
				/>
			</FormField>

			<FormField label={t("metadata.genres")}>
				<Input
					value={fields.genres}
					onChange={(e) => updateField("genres", e.target.value)}
					placeholder="Action, Drama, ..."
				/>
			</FormField>
		</>
	);
}
