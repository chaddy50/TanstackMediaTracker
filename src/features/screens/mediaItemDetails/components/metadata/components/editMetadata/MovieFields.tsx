import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "#/components/ui/input";
import { FormField } from "./FormField";

interface MovieFieldsProps {
	rawMetadata: Record<string, unknown>;
	onChange: (metadata: Record<string, unknown>) => void;
}

export function MovieFields({ rawMetadata, onChange }: MovieFieldsProps) {
	const { t } = useTranslation();
	const [fields, setFields] = useState({
		runtime:
			typeof rawMetadata.runtime === "number"
				? String(rawMetadata.runtime)
				: "",
	});

	function updateField(key: keyof typeof fields, value: string) {
		const updated = { ...fields, [key]: value };
		setFields(updated);
		onChange({
			...rawMetadata,
			runtime: updated.runtime ? parseInt(updated.runtime, 10) : undefined,
		});
	}

	return (
		<FormField label={t("metadata.runtime")}>
			<Input
				type="number"
				value={fields.runtime}
				onChange={(e) => updateField("runtime", e.target.value)}
			/>
		</FormField>
	);
}
