import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { PageHeader } from "#/components/common/PageHeader";
import { LibraryFilterDialog } from "#/components/dataViews/LibraryFilterDialog";
import { SeriesList } from "#/components/dataViews/components/SeriesList";
import { Button } from "#/components/ui/button";
import { type ViewFilters, mediaItemStatusEnum, mediaTypeEnum } from "#/db/schema";
import { SERIES_SORT_FIELDS } from "#/lib/sortFields";
import { getSeriesList, type SeriesListItem } from "#/server/seriesList";

const searchSchema = z.object({
	mediaTypes: z.array(z.enum(mediaTypeEnum.enumValues)).optional(),
	statuses: z.array(z.enum(mediaItemStatusEnum.enumValues)).optional(),
	isSeriesComplete: z.boolean().optional(),
	sortBy: z.enum(SERIES_SORT_FIELDS).optional(),
	sortDirection: z.enum(["asc", "desc"] as const).optional(),
});

type SeriesSearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/_authenticated/_app/series")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => getSeriesList({ data: deps }),
	component: SeriesPage,
});

function countActiveFilters(search: SeriesSearch): number {
	let count = 0;
	if (search.mediaTypes?.length) count += 1;
	if (search.statuses?.length) count += 1;
	if (search.isSeriesComplete !== undefined) count += 1;
	if (search.sortBy !== undefined && search.sortBy !== "name") count += 1;
	if (search.sortDirection !== undefined && search.sortDirection !== "asc") count += 1;
	return count;
}

function SeriesPage() {
	const seriesItems: SeriesListItem[] = Route.useLoaderData();
	const search = Route.useSearch();
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [isFilterOpen, setIsFilterOpen] = useState(false);

	const activeFilterCount = countActiveFilters(search);

	function handleApply(filters: ViewFilters) {
		navigate({
			to: "/series",
			search: () => ({
				mediaTypes: filters.mediaTypes,
				statuses: filters.statuses,
				isSeriesComplete: filters.isSeriesComplete,
				sortBy: filters.sortBy as SeriesSearch["sortBy"],
				sortDirection: filters.sortDirection,
			}),
		});
	}

	const filterButton = (
		<Button
			variant="outline"
			onClick={() => setIsFilterOpen(true)}
			className="gap-2"
		>
			<SlidersHorizontal />
			{t("library.filterAndSort")}
			{activeFilterCount > 0 && (
				<span className="bg-primary text-primary-foreground rounded-full text-xs size-5 flex items-center justify-center">
					{activeFilterCount}
				</span>
			)}
		</Button>
	);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<PageHeader title={t("series.title")} right={filterButton} />

			<LibraryFilterDialog
				isOpen={isFilterOpen}
				onClose={() => setIsFilterOpen(false)}
				initialFilters={search}
				onApply={handleApply}
				subject="series"
				title={t("library.filterAndSort")}
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
