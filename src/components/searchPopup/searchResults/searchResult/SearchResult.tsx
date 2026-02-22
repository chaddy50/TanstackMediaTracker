import type { SearchResultWithStatus } from "#/server/search";
import { ActionButton } from "./components/ActionButton";
import { Details } from "./components/Details";
import { Thumbnail } from "./components/Thumbnail";

interface SearchResultProps {
	result: SearchResultWithStatus;
}

export function SearchResult(props: SearchResultProps) {
	const { result } = props;

	return (
		<div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
			<Thumbnail url={result.coverImageUrl} title={result.title} />

			<Details
				title={result.title}
				year={result.releaseDate?.slice(0, 4)}
				type={result.type}
			/>

			<ActionButton result={result} />
		</div>
	);
}
