import { useTranslation } from "react-i18next";
import type { SearchResultWithStatus } from "#/features/mediaItemSearch/types";
import { resolveCreatorName } from "#/lib/creator";
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
				creator={resolveCreatorName(result.type, result.metadata) ?? undefined}
				year={formatReleaseYear(result.releaseDate, t) ?? undefined}
				series={getSeriesLabel(result) ?? undefined}
				type={result.type}
			/>

			<ActionButton result={result} onClose={onClose} />
		</div>
	);
}

/** Books also carry their position in the series; other types just have a name. */
function getSeriesLabel(result: SearchResultWithStatus): string | null {
	const { series, seriesBookNumber } = result.metadata;
	if (typeof series !== "string" || !series) {
		return null;
	}
	if (typeof seriesBookNumber === "string" && seriesBookNumber) {
		return `${series} #${seriesBookNumber}`;
	}
	return series;
}
