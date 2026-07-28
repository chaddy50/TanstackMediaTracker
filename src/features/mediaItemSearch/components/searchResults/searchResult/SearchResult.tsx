import { useTranslation } from "react-i18next";
import type { SearchResultWithStatus } from "#/features/mediaItemSearch/types";
import { formatReleaseYear } from "#/lib/releaseDate";
import { ActionButton } from "./components/ActionButton";
import { Details } from "./components/Details";
import { Thumbnail } from "./components/Thumbnail";

interface SearchResultProps {
	result: SearchResultWithStatus;
	onClose: () => void;
}

export function SearchResult(props: SearchResultProps) {
	const { result, onClose } = props;
	const { t } = useTranslation();

	return (
		<div
			tabIndex={-1}
			data-result=""
			className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 focus:bg-muted/50 focus:outline-none transition-colors"
		>
			<Thumbnail url={result.coverImageUrl} title={result.title} />

			<Details
				title={result.title}
				year={formatReleaseYear(result.releaseDate, t) ?? undefined}
				type={result.type}
			/>

			<ActionButton result={result} onClose={onClose} />
		</div>
	);
}
