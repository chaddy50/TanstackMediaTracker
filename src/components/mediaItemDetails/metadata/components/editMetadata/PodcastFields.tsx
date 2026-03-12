import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "#/components/ui/input";
import { FormField } from "./FormField";
import { parseArrayField } from "./parseArrayField";

interface PodcastFieldsProps {
	rawMetadata: Record<string, unknown>;
	onChange: (metadata: Record<string, unknown>) => void;
}

export function PodcastFields({ rawMetadata, onChange }: PodcastFieldsProps) {
	const { t } = useTranslation();
	const [fields, setFields] = useState({
		genres: Array.isArray(rawMetadata.genres)
			? rawMetadata.genres.join(", ")
			: "",
	});

	function updateField(key: keyof typeof fields, value: string) {
		const updated = { ...fields, [key]: value };
		setFields(updated);
		onChange({
			...rawMetadata,
			genres: parseArrayField(updated.genres),
		});
	}

	return (
		<>
			<FormField label={t("metadata.genres")}>
				<Input
					value={fields.genres}
					onChange={(e) => updateField("genres", e.target.value)}
					placeholder="History, Science, ..."
				/>
			</FormField>
		</>
	);
}
