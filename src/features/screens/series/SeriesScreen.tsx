import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useInfiniteScroll } from "#/components/hooks/useInfiniteScroll";
import { InfiniteScrollLoader } from "#/components/InfiniteScrollLoader";
import { SeriesList } from "#/components/SeriesList";
import { FilterAndSortButton } from "#/features/filterAndSort/FilterAndSortButton";
import { SearchInput } from "#/features/navigation/topBar/components/SearchInput";
import { TopBar } from "#/features/navigation/topBar/TopBar";
import { applySeriesSortDefaults } from "#/features/screens/settings/settings";
import { getSeriesList, type SeriesListItem } from "./series";

const route = getRouteApi("/_authenticated/_app/series");

export function SeriesScreen() {
	const loaderData = route.useLoaderData();
	const search = route.useSearch();
	const { t } = useTranslation();
	const [isFilterOpen, setIsFilterOpen] = useState(false);

	const effectiveSearch = applySeriesSortDefaults(search, loaderData.settings);

	const { allItems, isLoadingMore, sentinelRef } =
		useInfiniteScroll<SeriesListItem>({
			initialItems: loaderData.items,
			initialHasMore: loaderData.hasMore,
			fetchMore: (offset) =>
				getSeriesList({ data: { ...effectiveSearch, offset } }),
		});

	return (
		<div className="min-h-screen bg-background text-foreground">
			<TopBar
				title={t("series.title")}
				right={
					<>
						<SearchInput value={search.titleQuery ?? ""} navigateTo="/series" />
						<FilterAndSortButton
							filterAndSortChoices={effectiveSearch}
							isFilterAndSortPopupOpen={isFilterOpen}
							setIsFilterAndSortPopupOpen={setIsFilterOpen}
							navigateTo="/series"
							subject="series"
						/>
					</>
				}
			/>

			<main className="px-4 md:px-6 py-6">
				{allItems.length === 0 && !isLoadingMore ? (
					<p className="text-muted-foreground text-center py-12">
						{t("series.empty")}
					</p>
				) : (
					<>
						<SeriesList items={allItems} />
						<div ref={sentinelRef} className="h-1" />
						<InfiniteScrollLoader isLoading={isLoadingMore} />
					</>
				)}
			</main>
		</div>
	);
}
