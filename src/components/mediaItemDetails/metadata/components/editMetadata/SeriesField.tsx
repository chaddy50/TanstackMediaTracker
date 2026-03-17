import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { SearchableCombobox } from "#/components/ui/combobox";
import type { MediaItemType } from "#/lib/enums";
import { getSeriesListByType } from "#/server/series/series";

import { FormField } from "./FormField";

const NO_SERIES_VALUE = "__none__";
const PENDING_NEW_VALUE = "__pending_new__";

export type SeriesFieldValue =
	| { mode: "existing"; seriesId: number }
	| { mode: "new"; name: string }
	| { mode: "none" };

interface SeriesFieldProps {
	type: MediaItemType;
	initialSeriesId: number | null;
	onChange: (value: SeriesFieldValue) => void;
}

export function SeriesField({
	type,
	initialSeriesId,
	onChange,
}: SeriesFieldProps) {
	const { t } = useTranslation();
	const [seriesList, setSeriesList] = useState<{ id: number; name: string }[]>(
		[],
	);
	const [selectValue, setSelectValue] = useState<string>(
		initialSeriesId !== null ? String(initialSeriesId) : NO_SERIES_VALUE,
	);
	const [pendingNewSeries, setPendingNewSeries] = useState("");

	useEffect(() => {
		getSeriesListByType({ data: { type } }).then(setSeriesList);
	}, [type]);

	const triggerLabel =
		selectValue === NO_SERIES_VALUE
			? t("metadata.noSeries")
			: selectValue === PENDING_NEW_VALUE
				? pendingNewSeries
				: (seriesList.find((s) => String(s.id) === selectValue)?.name ?? "");

	function handleSelect(id: number | null) {
		if (id === null) {
			setSelectValue(NO_SERIES_VALUE);
			setPendingNewSeries("");
			onChange({ mode: "none" });
		} else {
			setSelectValue(String(id));
			setPendingNewSeries("");
			onChange({ mode: "existing", seriesId: id });
		}
	}

	function handleCreateNew(name: string) {
		setPendingNewSeries(name);
		setSelectValue(PENDING_NEW_VALUE);
		onChange({ mode: "new", name });
	}

	return (
		<FormField label={t("metadata.series")}>
			<SearchableCombobox
				items={seriesList}
				triggerLabel={triggerLabel}
				noValueLabel={t("metadata.noSeries")}
				createNewLabel={(name) => `${t("metadata.createNewSeries")} "${name}"`}
				onSelect={handleSelect}
				onCreateNew={handleCreateNew}
			/>
		</FormField>
	);
}
