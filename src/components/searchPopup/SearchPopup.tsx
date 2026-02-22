import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import type { MediaItemType } from "#/lib/enums";
import { type SearchResultWithStatus, searchMedia } from "#/server/search";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SearchEntryField } from "./searchField/SearchEntryField";
import { SearchFilters } from "./searchField/SearchFilters";
import { SearchResults } from "./searchResults/SearchResults";

export type SearchType = "all" | MediaItemType;

interface SearchPopupProps {
	isOpen: boolean;
	onClose: () => void;
}

export function SearchPopup(props: SearchPopupProps) {
	const { isOpen, onClose } = props;
	const { t } = useTranslation();
	const [query, setQuery] = useState("");
	const [filterType, setFilterType] = useState<SearchType>("all");
	const [results, setResults] = useState<SearchResultWithStatus[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Focus input when modal opens
	useEffect(() => {
		if (isOpen) {
			setTimeout(() => inputRef.current?.focus(), 50);
		} else {
			// Reset state when closed
			setQuery("");
			setResults([]);
			setIsSearching(false);
		}
	}, [isOpen]);

	// Debounced search
	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);

		if (!query.trim()) {
			setResults([]);
			setIsSearching(false);
			return;
		}

		setIsSearching(true);
		debounceRef.current = setTimeout(async () => {
			try {
				const data = await searchMedia({
					data: { query: query.trim(), type: filterType },
				});
				setResults(data);
			} catch {
				setResults([]);
			} finally {
				setIsSearching(false);
			}
		}, 400);

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [query, filterType]);

	return (
		<Dialog open={isOpen} onOpenChange={(isOpen) => !isOpen && onClose()}>
			<DialogContent className="sm:max-w-xl p-0 gap-0">
				<DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
					<DialogTitle className="sr-only">{t("search.title")}</DialogTitle>

					<SearchEntryField
						fieldRef={inputRef}
						query={query}
						setQuery={setQuery}
					/>

					<SearchFilters type={filterType} setType={setFilterType} />
				</DialogHeader>

				<div className="overflow-y-auto max-h-[60vh] px-2 py-2">
					<SearchResults
						isSearching={isSearching}
						query={query}
						results={results}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
