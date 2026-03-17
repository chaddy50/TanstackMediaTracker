import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { SearchableCombobox } from "#/components/ui/combobox";
import { getCreatorListForUser } from "#/server/creators/creators";

import { FormField } from "./FormField";

const NO_CREATOR_VALUE = "__none__";
const PENDING_NEW_VALUE = "__pending_new__";

export type CreatorFieldValue =
	| { mode: "existing"; creatorId: number }
	| { mode: "new"; name: string }
	| { mode: "none" };

interface CreatorFieldProps {
	label: string;
	initialCreatorId: number | null;
	onChange: (value: CreatorFieldValue) => void;
}

export function CreatorField({
	label,
	initialCreatorId,
	onChange,
}: CreatorFieldProps) {
	const { t } = useTranslation();
	const [creatorList, setCreatorList] = useState<
		{ id: number; name: string }[]
	>([]);
	const [selectValue, setSelectValue] = useState<string>(
		initialCreatorId !== null ? String(initialCreatorId) : NO_CREATOR_VALUE,
	);
	const [pendingNewCreator, setPendingNewCreator] = useState("");

	useEffect(() => {
		getCreatorListForUser().then(setCreatorList);
	}, []);

	const triggerLabel =
		selectValue === NO_CREATOR_VALUE
			? t("metadata.noCreator")
			: selectValue === PENDING_NEW_VALUE
				? pendingNewCreator
				: (creatorList.find((c) => String(c.id) === selectValue)?.name ?? "");

	function handleSelect(id: number | null) {
		if (id === null) {
			setSelectValue(NO_CREATOR_VALUE);
			setPendingNewCreator("");
			onChange({ mode: "none" });
		} else {
			setSelectValue(String(id));
			setPendingNewCreator("");
			onChange({ mode: "existing", creatorId: id });
		}
	}

	function handleCreateNew(name: string) {
		setPendingNewCreator(name);
		setSelectValue(PENDING_NEW_VALUE);
		onChange({ mode: "new", name });
	}

	return (
		<FormField label={label}>
			<SearchableCombobox
				items={creatorList}
				triggerLabel={triggerLabel}
				noValueLabel={t("metadata.noCreator")}
				createNewLabel={(name) => `${t("metadata.createNewCreator")} "${name}"`}
				onSelect={handleSelect}
				onCreateNew={handleCreateNew}
			/>
		</FormField>
	);
}
