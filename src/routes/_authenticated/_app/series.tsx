import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FilterAndSortButton } from "#/components/common/FilterAndSortButton";
import { InfiniteScrollLoader } from "#/components/common/InfiniteScrollLoader";
import { PageHeader } from "#/components/common/PageHeader";
import { SeriesList } from "#/components/common/SeriesList";
import { useInfiniteScroll } from "#/hooks/useInfiniteScroll";
import { getSeriesList, type SeriesListItem } from "#/server/series/seriesList";
import { applySeriesSortDefaults, getUserSettings } from "#/server/settings";
import { filterAndSortOptionsSchema } from "#/server/views";

export const Route = createFileRoute("/_authenticated/_app/series")({
	validateSearch: filterAndSortOptionsSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => {
		const settings = await getUserSettings();
		const effectiveDeps = applySeriesSortDefaults(deps, settings);
		const data = await getSeriesList({ data: effectiveDeps });
		return { ...data, settings };
	},
	component: SeriesPage,
});

function SeriesPage() {
	const loaderData = Route.useLoaderData();
	const search = Route.useSearch();
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
			<PageHeader
				title={t("series.title")}
				right={
					<FilterAndSortButton
						filterAndSortChoices={effectiveSearch}
						isFilterAndSortPopupOpen={isFilterOpen}
						setIsFilterAndSortPopupOpen={setIsFilterOpen}
						navigateTo="/series"
						subject="series"
					/>
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
