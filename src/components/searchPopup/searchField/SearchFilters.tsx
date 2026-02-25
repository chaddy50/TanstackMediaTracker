import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { MediaItemType } from "#/lib/enums";
import { Toggle } from "@/components/ui/toggle";
import type { SearchType } from "../SearchPopup";

const TYPE_OPTIONS = [
	{ value: "all" as SearchType, labelKey: "library.allTypes" as const },
	{
		value: MediaItemType.BOOK as SearchType,
		labelKey: "mediaType.book" as const,
	},
	{
		value: MediaItemType.MOVIE as SearchType,
		labelKey: "mediaType.movie" as const,
	},
	{
		value: MediaItemType.TV_SHOW as SearchType,
		labelKey: "mediaType.tv_show" as const,
	},
	{
		value: MediaItemType.VIDEO_GAME as SearchType,
		labelKey: "mediaType.video_game" as const,
	},
];

interface SearchFiltersProps {
	type: SearchType;
	setType: Dispatch<SetStateAction<SearchType>>;
}

export function SearchFilters(props: SearchFiltersProps) {
	const { type, setType } = props;
	const { t } = useTranslation();

	return (
		<div className="flex gap-1.5 flex-wrap pt-2">
			{TYPE_OPTIONS.map((option) => (
				<Toggle
					key={option.value}
					data-filter=""
					variant="outline"
					pressed={type === option.value}
					onPressedChange={() => setType(option.value)}
					size="sm"
				>
					{t(option.labelKey)}
				</Toggle>
			))}
		</div>
	);
}
