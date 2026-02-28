import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AddMediaButton } from "#/components/common/AddMediaButton";
import { PageHeader } from "#/components/common/PageHeader";
import { MediaCard } from "#/components/MediaCard";
import { Button } from "#/components/ui/button";
import { EditViewDialog } from "#/components/views/EditViewDialog";
import { SeriesList } from "#/components/views/SeriesList";
import type { MediaItemStatus, MediaItemType } from "#/lib/enums";
import type { View } from "#/server/views";
import { deleteView, getViewResults } from "#/server/views";

export const Route = createFileRoute("/views/$viewId")({
	loader: ({ params }) =>
		getViewResults({ data: { viewId: parseInt(params.viewId, 10) } }),
	component: ViewPage,
});

function ViewPage() {
	const { view, results } = Route.useLoaderData();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { t } = useTranslation();
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

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
					<div className="flex items-center gap-2">
						<Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
							{t("views.editView")}
						</Button>
						<AddMediaButton />
					</div>
				}
			/>

			<main className="px-6 py-6">
				{view.subject === "items" ? (
					<ItemResults items={results as ItemResult[]} />
				) : (
					<SeriesList items={results as SeriesResult[]} />
				)}
			</main>

			<EditViewDialog
				view={view as View}
				isOpen={isEditDialogOpen}
				onClose={() => setIsEditDialogOpen(false)}
				onUpdated={handleUpdated}
				onDelete={handleDelete}
				isDeleting={isDeleting}
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Item results
// ---------------------------------------------------------------------------

interface ItemResult {
	id: number;
	status: MediaItemStatus;
	isPurchased: boolean;
	mediaItemId: number;
	title: string;
	type: MediaItemType;
	coverImageUrl: string | null;
	seriesId: number | null;
	seriesName: string | null;
	rating: number;
}

interface SeriesResult {
	id: number;
	name: string;
	type: MediaItemType;
	status: MediaItemStatus;
	isComplete: boolean;
	itemCount: number;
}

function ItemResults({ items }: { items: ItemResult[] }) {
	const { t } = useTranslation();

	if (items.length === 0) {
		return (
			<p className="text-muted-foreground text-center py-12">
				{t("views.empty")}
			</p>
		);
	}

	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
			{items.map((item) => (
				<MediaCard key={item.id} mediaItem={item} />
			))}
		</div>
	);
}
