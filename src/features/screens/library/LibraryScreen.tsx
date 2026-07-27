import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useInfiniteScroll } from "#/components/hooks/useInfiniteScroll";
import { InfiniteScrollLoader } from "#/components/InfiniteScrollLoader";
import { MediaItemList } from "#/components/MediaItemList";
import { FilterAndSortButton } from "#/features/filterAndSort/FilterAndSortButton";
import { SearchInput } from "#/features/navigation/topBar/components/SearchInput";
import { TopBar } from "#/features/navigation/topBar/TopBar";
import { applyLibrarySortDefaults } from "#/features/screens/settings/settings";
import { getLibrary, type LibraryItem } from "./library";

const route = getRouteApi("/_authenticated/_app/library");

export function LibraryScreen() {
	const loaderData = route.useLoaderData();
	const search = route.useSearch();
	const { t } = useTranslation();
	const [isFilterOpen, setIsFilterOpen] = useState(false);

	const effectiveSearch = applyLibrarySortDefaults(search, loaderData.settings);

	const { allItems, isLoadingMore, sentinelRef } =
		useInfiniteScroll<LibraryItem>({
			initialItems: loaderData.items,
			initialHasMore: loaderData.hasMore,
			fetchMore: (offset) =>
				getLibrary({ data: { ...effectiveSearch, offset } }),
		});

	return (
		<div className="min-h-screen bg-background text-foreground">
			<TopBar
				title={t("library.title")}
				right={
					<>
						<SearchInput
							value={search.titleQuery ?? ""}
							navigateTo="/library"
						/>
						<FilterAndSortButton
							filterAndSortChoices={effectiveSearch}
							isFilterAndSortPopupOpen={isFilterOpen}
							setIsFilterAndSortPopupOpen={setIsFilterOpen}
							navigateTo="/library"
						/>
					</>
				}
			/>

			<main className="px-4 md:px-6 py-6">
				<MediaItemList items={allItems} />
				<div ref={sentinelRef} className="h-1" />
				<InfiniteScrollLoader isLoading={isLoadingMore} />
			</main>
		</div>
	);
}
