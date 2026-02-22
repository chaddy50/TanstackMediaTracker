import type { SearchResultWithStatus } from "@/server/search";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SearchResult } from "./searchResult/SearchResult";

interface SearchResultsProps {
	isSearching: boolean;
	query: string;
	results: SearchResultWithStatus[];
}

export function SearchResults(props: SearchResultsProps) {
	const { isSearching, query, results } = props;
	const { t } = useTranslation();

	const isQueryEmpty = !query.trim();

	const doesSearchHaveResults = useMemo(() => {
		return !isSearching && !isQueryEmpty && results.length > 0;
	}, [isSearching, isQueryEmpty, results]);

	const searchMessage = useMemo(() => {
		if (doesSearchHaveResults) {
			return "";
		}

		if (isSearching) {
			return t("search.searching");
		} else if (isQueryEmpty) {
			return t("search.prompt");
		} else {
			return t("search.noResults");
		}
	}, [isSearching, isQueryEmpty, doesSearchHaveResults, t]);

	return doesSearchHaveResults ? (
		<div className="flex flex-col">
			{results.map((result) => (
				<SearchResult
					key={`${result.externalSource}:${result.externalId}`}
					result={result}
				/>
			))}
		</div>
	) : (
		<p className="text-sm text-muted-foreground text-center py-6">
			{searchMessage}
		</p>
	);
}
