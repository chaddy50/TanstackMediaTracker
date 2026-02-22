import type { Dispatch, RefObject, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../ui/input";

interface SearchEntryFieldProps {
	query: string;
	setQuery: Dispatch<SetStateAction<string>>;
	fieldRef: RefObject<HTMLInputElement | null>;
}

export function SearchEntryField(props: SearchEntryFieldProps) {
	const { query, setQuery, fieldRef } = props;
	const { t } = useTranslation();

	return (
		<Input
			ref={fieldRef}
			value={query}
			onChange={(event) => setQuery(event.target.value)}
			placeholder={t("search.placeholder")}
			className="border-0 shadow-none focus-visible:ring-0 text-base px-0"
		/>
	);
}
