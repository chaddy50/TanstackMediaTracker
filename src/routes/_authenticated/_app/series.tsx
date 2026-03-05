import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "#/components/common/PageHeader";
import { getSeriesList, type SeriesListItem } from "#/server/seriesList";
import { FilterAndSortButton } from "#/components/common/FilterAndSortButton";
import { SeriesList } from "#/components/common/SeriesList";
import { filterAndSortOptionsSchema } from "#/server/views";

export const Route = createFileRoute("/_authenticated/_app/series")({
	validateSearch: filterAndSortOptionsSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => getSeriesList({ data: deps }),
	component: SeriesPage,
});

function SeriesPage() {
	const seriesItems: SeriesListItem[] = Route.useLoaderData();
	const search = Route.useSearch();
	const { t } = useTranslation();
	const [isFilterOpen, setIsFilterOpen] = useState(false);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<PageHeader
				title={t("series.title")}
				right={
					<FilterAndSortButton
						filterAndSortChoices={search}
						isFilterAndSortPopupOpen={isFilterOpen}
						setIsFilterAndSortPopupOpen={setIsFilterOpen}
						navigateTo="/series"
					/>
				}
			/>

			<main className="px-6 py-6">
				{seriesItems.length === 0 ? (
					<p className="text-muted-foreground text-center py-12">
						{t("series.empty")}
					</p>
				) : (
					<SeriesList items={seriesItems} />
				)}
			</main>
		</div>
	);
}
