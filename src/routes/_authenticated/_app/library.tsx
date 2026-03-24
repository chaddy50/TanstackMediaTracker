import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FilterAndSortButton } from "#/components/common/FilterAndSortButton";
import { InfiniteScrollLoader } from "#/components/common/InfiniteScrollLoader";
import { PageHeader } from "#/components/common/PageHeader";
import { SearchInput } from "#/components/common/SearchInput";
import { useInfiniteScroll } from "#/hooks/useInfiniteScroll";
import {
	getLibrary,
	type LibraryItem,
} from "#/server/mediaItems/mediaItemList";
import { applyLibrarySortDefaults, getUserSettings } from "#/server/settings";
import { filterAndSortOptionsSchema } from "#/server/views";
import { MediaItemList } from "@/components/common/MediaItemList";

export const Route = createFileRoute("/_authenticated/_app/library")({
	validateSearch: filterAndSortOptionsSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => {
		const settings = await getUserSettings();
		const effectiveDeps = applyLibrarySortDefaults(deps, settings);
		const data = await getLibrary({ data: effectiveDeps });
		return { ...data, settings };
	},
	component: LibraryPage,
});

function LibraryPage() {
	const loaderData = Route.useLoaderData();
	const search = Route.useSearch();
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
			<PageHeader
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
