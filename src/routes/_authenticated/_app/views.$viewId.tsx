import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { PageHeader } from "#/components/common/PageHeader";
import { SearchInput } from "#/components/common/SearchInput";
import { SeriesList } from "#/components/common/SeriesList";
import { Button } from "#/components/ui/button";
import { EditViewDialog } from "#/components/views/EditViewDialog";
import { InfiniteScrollLoader } from "#/components/common/InfiniteScrollLoader";
import { useInfiniteScroll } from "#/hooks/useInfiniteScroll";
import type { LibraryItem } from "#/server/library";
import type { SeriesListItem } from "#/server/seriesList";
import type { View } from "#/server/views";
import { deleteView, getViewResults } from "#/server/views";
import { MediaItemList } from "@/components/common/MediaItemList";

type PaginatedResult<T> = { items: T[]; hasMore: boolean };

export const Route = createFileRoute("/_authenticated/_app/views/$viewId")({
	validateSearch: z.object({ titleQuery: z.string().optional() }),
	loaderDeps: ({ search }) => search,
	loader: ({ params, deps }) =>
		getViewResults({
			data: {
				viewId: parseInt(params.viewId, 10),
				titleQuery: deps.titleQuery,
			},
		}),
	staleTime: 30_000,
	component: ViewPage,
});

function ViewPage() {
	const { view, results } = Route.useLoaderData();
	const search = Route.useSearch();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { t } = useTranslation();
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [_isDeleting, setIsDeleting] = useState(false);

	const isItemView = view.subject === "items";
	const paginatedResults = results as PaginatedResult<LibraryItem> | PaginatedResult<SeriesListItem>;

	const { allItems, isLoadingMore, sentinelRef } = useInfiniteScroll<LibraryItem | SeriesListItem>({
		initialItems: paginatedResults.items,
		initialHasMore: paginatedResults.hasMore,
		fetchMore: (offset) =>
			getViewResults({
				data: { viewId: view.id, titleQuery: search.titleQuery, offset },
			}).then((result) => result.results as PaginatedResult<LibraryItem | SeriesListItem>),
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
			<PageHeader
				title={view.name}
				right={
					<>
						{isItemView && (
							<SearchInput
								value={search.titleQuery ?? ""}
								navigateTo="/views/$viewId"
								params={{ viewId: String(view.id) }}
							/>
						)}
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
					<MediaItemList items={allItems as LibraryItem[]} />
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
