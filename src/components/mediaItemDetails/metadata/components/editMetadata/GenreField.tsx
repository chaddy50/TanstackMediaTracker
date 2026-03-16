import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { SearchableCombobox } from "#/components/ui/combobox";
import { getGenres } from "#/server/genres";

import { FormField } from "./FormField";

const NO_GENRE_VALUE = "__none__";

export type GenreFieldValue =
	| { mode: "set"; name: string }
	| { mode: "none" };

interface GenreFieldProps {
	initialGenreName: string | null;
	onChange: (value: GenreFieldValue) => void;
}

export function GenreField({ initialGenreName, onChange }: GenreFieldProps) {
	const { t } = useTranslation();
	const [genreList, setGenreList] = useState<{ id: number; name: string }[]>(
		[],
	);
	const [selectValue, setSelectValue] = useState<string>(
		initialGenreName !== null ? initialGenreName : NO_GENRE_VALUE,
	);

	useEffect(() => {
		getGenres().then(setGenreList);
	}, []);

	// Map names to synthetic IDs for SearchableCombobox (which uses number ids).
	// We synthesize IDs from the list index for new entries not yet in the DB.
	const items = genreList.map((g) => ({ id: g.id, name: g.name }));

	const triggerLabel =
		selectValue === NO_GENRE_VALUE ? t("genre.noGenre") : selectValue;

	function handleSelect(id: number | null) {
		if (id === null) {
			setSelectValue(NO_GENRE_VALUE);
			onChange({ mode: "none" });
		} else {
			const genre = genreList.find((g) => g.id === id);
			if (genre) {
				setSelectValue(genre.name);
				onChange({ mode: "set", name: genre.name });
			}
		}
	}

	function handleCreateNew(name: string) {
		setSelectValue(name);
		onChange({ mode: "set", name });
	}

	return (
		<FormField label={t("metadata.genre")}>
			<SearchableCombobox
				items={items}
				triggerLabel={triggerLabel}
				noValueLabel={t("genre.noGenre")}
				createNewLabel={(name) => `${t("genre.createNewGenre")} "${name}"`}
				onSelect={handleSelect}
				onCreateNew={handleCreateNew}
			/>
		</FormField>
	);
}
