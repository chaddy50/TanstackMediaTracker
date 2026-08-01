import { useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useRouter } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useInfiniteScroll } from "#/components/hooks/useInfiniteScroll";
import { InfiniteScrollLoader } from "#/components/InfiniteScrollLoader";
import { MediaItemList } from "#/components/MediaItemList";
import { SeriesList } from "#/components/SeriesList";
import { Button } from "#/components/ui/button";
import { SearchInput } from "#/features/navigation/topBar/components/SearchInput";
import { TopBar } from "#/features/navigation/topBar/TopBar";
import { EditViewDialog } from "#/features/screens/customView/EditViewDialog";
import type { LibraryItem } from "#/features/screens/library/library";
import type { SeriesListItem } from "#/features/screens/series/series";
import { isFilteredToSinglePurchaseStatus } from "#/lib/filterAndSort";
import { deleteView, getViewResults, type View } from "./view";

type PaginatedResult<T> = { items: T[]; hasMore: boolean };

const route = getRouteApi("/_authenticated/_app/views/$viewId");

export function ViewScreen() {
	const { view, results } = route.useLoaderData();
	const search = route.useSearch();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { t } = useTranslation();
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [_isDeleting, setIsDeleting] = useState(false);

	const isItemView = view.subject === "items";
	const shouldShowPurchaseStatus = !isFilteredToSinglePurchaseStatus(
		view.filters?.purchaseStatuses,
	);
	const paginatedResults = results as
		| PaginatedResult<LibraryItem>
		| PaginatedResult<SeriesListItem>;

	const { allItems, isLoadingMore, sentinelRef } = useInfiniteScroll<
		LibraryItem | SeriesListItem
	>({
		initialItems: paginatedResults.items,
		initialHasMore: paginatedResults.hasMore,
		fetchMore: (offset) =>
			getViewResults({
				data: { viewId: view.id, titleQuery: search.titleQuery, offset },
			}).then(
				(result) =>
					result.results as PaginatedResult<LibraryItem | SeriesListItem>,
			),
	});

	async function handleDelete() {
		setIsDeleting(true);
		try {
			await deleteView({ data: { id: view.id } });
			await queryClient.invalidateQueries({ queryKey: ["views"] });
			router.history.back();
		} finally {
			setIsDeleting(false);
		}
	}

	function handleUpdated() {
		router.invalidate();
	}

	return (
		<div className="min-h-screen bg-background text-foreground">
			<TopBar
				title={view.name}
				right={
					<>
						<SearchInput
							value={search.titleQuery ?? ""}
							navigateTo="/views/$viewId"
							params={{ viewId: String(view.id) }}
						/>
						<Button
							variant="outline"
							size="icon"
							className="sm:w-auto sm:px-4"
							onClick={() => setIsEditDialogOpen(true)}
						>
							<Pencil className="size-4" />
							<span className="sr-only sm:not-sr-only sm:ml-1">
								{t("views.editView")}
							</span>
						</Button>
					</>
				}
			/>

			<main className="px-4 md:px-6 py-6">
				{isItemView ? (
					<MediaItemList
						items={allItems as LibraryItem[]}
						shouldShowPurchaseStatus={shouldShowPurchaseStatus}
					/>
				) : (
					<SeriesList items={allItems as SeriesListItem[]} />
				)}
				<div ref={sentinelRef} className="h-1" />
				<InfiniteScrollLoader isLoading={isLoadingMore} />
			</main>

			<EditViewDialog
				view={view as View}
				isOpen={isEditDialogOpen}
				onClose={() => setIsEditDialogOpen(false)}
				onUpdated={handleUpdated}
				onDelete={handleDelete}
			/>
		</div>
	);
}
