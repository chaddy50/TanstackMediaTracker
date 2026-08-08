import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
	getMissingSeriesItems,
	type MissingSeriesItem,
} from "#/features/screens/seriesDetails/seriesDetails";
import { MediaItemType } from "#/lib/enums";
import { MissingSeriesItemCard } from "./MissingSeriesItemCard";

/**
 * The media types an external provider can enumerate a series for. TV shows and
 * podcasts are absent by design — see FETCH_SERIES_ITEMS_BY_TYPE in
 * missingSeriesItems.server.ts.
 */
const SUPPORTED_TYPES: MediaItemType[] = [
	MediaItemType.BOOK,
	MediaItemType.MOVIE,
	MediaItemType.VIDEO_GAME,
];

// The provider's roster for a series barely changes, so a re-expand within the
// same visit should not cost another upstream call.
const MISSING_ITEMS_STALE_TIME = 5 * 60 * 1000;

interface MissingSeriesItemsProps {
	seriesId: number;
	seriesType: MediaItemType;
}

/**
 * The items this series contains that the user has not added yet, collapsed by
 * default so they don't compete with the library items above.
 *
 * Collapsed means genuinely idle: the query is gated on `isExpanded`, so a user
 * who never opens the section never triggers an external API call.
 */
export function MissingSeriesItems({
	seriesId,
	seriesType,
}: MissingSeriesItemsProps) {
	const { t } = useTranslation();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [isExpanded, setIsExpanded] = useState(false);

	const isSupportedType = SUPPORTED_TYPES.includes(seriesType);
	const queryKey = ["missingSeriesItems", seriesId];

	const {
		data: missingItems,
		isLoading,
		isError,
	} = useQuery({
		queryKey,
		queryFn: () => getMissingSeriesItems({ data: { seriesId } }),
		enabled: isExpanded && isSupportedType,
		staleTime: MISSING_ITEMS_STALE_TIME,
	});

	if (!isSupportedType) {
		return null;
	}

	/**
	 * Drops the added item from the cached list instead of refetching — a
	 * refetch would hit the external provider again on every single add — and
	 * invalidates the route so the loader pulls the item into the grid above.
	 */
	async function handleAdded(addedItem: MissingSeriesItem) {
		queryClient.setQueryData<MissingSeriesItem[]>(queryKey, (currentItems) =>
			(currentItems ?? []).filter(
				(candidate) =>
					candidate.externalId !== addedItem.externalId ||
					candidate.externalSource !== addedItem.externalSource,
			),
		);
		await router.invalidate();
	}

	return (
		<div className="mt-10">
			<button
				type="button"
				onClick={() => setIsExpanded((wasExpanded) => !wasExpanded)}
				aria-expanded={isExpanded}
				className="flex items-center gap-2 text-xl font-semibold hover:text-foreground/80 transition-colors"
			>
				<ChevronDownIcon
					className={`size-5 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
				/>
				{t("seriesDetails.missingItems")}
				{missingItems && missingItems.length > 0 && (
					<span className="text-sm font-normal text-muted-foreground">
						{t("seriesDetails.missingItemsCount", {
							count: missingItems.length,
						})}
					</span>
				)}
			</button>

			{isExpanded && (
				<div className="mt-4">
					{isLoading ? (
						<p className="text-muted-foreground">
							{t("seriesDetails.missingItemsLoading")}
						</p>
					) : isError ? (
						<p className="text-muted-foreground">
							{t("seriesDetails.missingItemsError")}
						</p>
					) : !missingItems || missingItems.length === 0 ? (
						<p className="text-muted-foreground">
							{t("seriesDetails.missingItemsEmpty")}
						</p>
					) : (
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
							{missingItems.map((item) => (
								<MissingSeriesItemCard
									key={`${item.externalSource}:${item.externalId}`}
									item={item}
									onAdded={handleAdded}
								/>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
