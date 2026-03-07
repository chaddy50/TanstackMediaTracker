import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { PageHeader } from "#/components/common/PageHeader";
import { SearchInput } from "#/components/common/SearchInput";
import { SeriesList } from "#/components/common/SeriesList";
import { Button } from "#/components/ui/button";
import { EditViewDialog } from "#/components/views/EditViewDialog";
import type { View } from "#/server/views";
import { deleteView, getViewResults } from "#/server/views";
import { MediaItemList } from "@/components/common/MediaItemList";
import type { LibraryItem } from "@/server/library";
import type { SeriesListItem } from "@/server/seriesList";

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
						{view.subject === "items" && (
							<SearchInput
								value={search.titleQuery ?? ""}
								navigateTo="/views/$viewId"
								params={{ viewId: String(view.id) }}
							/>
						)}
						<Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
							{t("views.editView")}
						</Button>
					</>
				}
			/>

			<main className="px-6 py-6">
				{view.subject === "items" ? (
					<MediaItemList items={results as LibraryItem[]} />
				) : (
					<SeriesList items={results as SeriesListItem[]} />
				)}
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
