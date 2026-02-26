import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "#/components/ui/input";
import { FormField } from "./FormField";
import { parseArrayField } from "./parseArrayField";

interface BookFieldsProps {
	rawMetadata: Record<string, unknown>;
	onChange: (metadata: Record<string, unknown>) => void;
}

export function BookFields({ rawMetadata, onChange }: BookFieldsProps) {
	const { t } = useTranslation();
	const [fields, setFields] = useState({
		author: typeof rawMetadata.author === "string" ? rawMetadata.author : "",
		pageCount:
			typeof rawMetadata.pageCount === "number"
				? String(rawMetadata.pageCount)
				: "",
		seriesBookNumber:
			typeof rawMetadata.seriesBookNumber === "string"
				? rawMetadata.seriesBookNumber
				: "",
		genres: Array.isArray(rawMetadata.genres)
			? rawMetadata.genres.join(", ")
			: "",
	});

	function updateField(key: keyof typeof fields, value: string) {
		const updated = { ...fields, [key]: value };
		setFields(updated);
		onChange({
			author: updated.author || undefined,
			pageCount: updated.pageCount ? parseInt(updated.pageCount, 10) : undefined,
			seriesBookNumber: updated.seriesBookNumber || undefined,
			genres: parseArrayField(updated.genres),
		});
	}

	return (
		<>
			<FormField label={t("metadata.author")}>
				<Input
					value={fields.author}
					onChange={(e) => updateField("author", e.target.value)}
				/>
			</FormField>

			<FormField label={t("metadata.seriesBookNumber")}>
				<Input
					value={fields.seriesBookNumber}
					onChange={(e) => updateField("seriesBookNumber", e.target.value)}
				/>
			</FormField>

			<FormField label={t("metadata.pageCount")}>
				<Input
					type="number"
					value={fields.pageCount}
					onChange={(e) => updateField("pageCount", e.target.value)}
				/>
			</FormField>

			<FormField label={t("metadata.genres")}>
				<Input
					value={fields.genres}
					onChange={(e) => updateField("genres", e.target.value)}
					placeholder="Fantasy, Adventure, ..."
				/>
			</FormField>
		</>
	);
}
