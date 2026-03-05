import { FilterAndSortButton } from "#/components/common/FilterAndSortButton";
import { PageHeader } from "#/components/common/PageHeader";
import { getLibrary, type LibraryItem } from "#/server/library";
import { filterAndSortOptionsSchema } from "#/server/views";
import { MediaItemList } from "@/components/common/MediaItemList";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
export const Route = createFileRoute("/_authenticated/_app/library")({
	validateSearch: filterAndSortOptionsSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => getLibrary({ data: deps }),
	component: LibraryPage,
});

function LibraryPage() {
	const mediaItems: LibraryItem[] = Route.useLoaderData();
	const search = Route.useSearch();
	const { t } = useTranslation();
	const [isFilterOpen, setIsFilterOpen] = useState(false);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<PageHeader
				title={t("library.title")}
				right={
					<FilterAndSortButton
						filterAndSortChoices={search}
						isFilterAndSortPopupOpen={isFilterOpen}
						setIsFilterAndSortPopupOpen={setIsFilterOpen}
						navigateTo="/library"
					/>
				}
			/>

			<main className="px-6 py-6">
				<MediaItemList items={mediaItems} />
			</main>
		</div>
	);
}
