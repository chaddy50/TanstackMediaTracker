import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "#/components/ui/input";
import { FormField } from "./FormField";

interface BookFieldsProps {
	rawMetadata: Record<string, unknown>;
	onChange: (metadata: Record<string, unknown>) => void;
}

export function BookFields({ rawMetadata, onChange }: BookFieldsProps) {
	const { t } = useTranslation();
	const [fields, setFields] = useState({
		pageCount:
			typeof rawMetadata.pageCount === "number"
				? String(rawMetadata.pageCount)
				: "",
		seriesBookNumber:
			typeof rawMetadata.seriesBookNumber === "string"
				? rawMetadata.seriesBookNumber
				: "",
	});

	function updateField(key: keyof typeof fields, value: string) {
		const updated = { ...fields, [key]: value };
		setFields(updated);
		onChange({
			...rawMetadata,
			pageCount: updated.pageCount ? parseInt(updated.pageCount, 10) : undefined,
			seriesBookNumber: updated.seriesBookNumber || undefined,
		});
	}

	return (
		<>
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
		</>
	);
}
