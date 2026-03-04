import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { PageHeader } from "#/components/common/PageHeader";
import { LibraryFilterDialog } from "#/components/dataViews/LibraryFilterDialog";
import { MediaCard } from "#/components/MediaCard";
import { Button } from "#/components/ui/button";
import { type ViewFilters, mediaItemStatusEnum, mediaTypeEnum } from "#/db/schema";
import { ITEM_SORT_FIELDS } from "#/lib/sortFields";
import { getLibrary, type LibraryItem } from "#/server/library";

const searchSchema = z.object({
	mediaTypes: z.array(z.enum(mediaTypeEnum.enumValues)).optional(),
	statuses: z.array(z.enum(mediaItemStatusEnum.enumValues)).optional(),
	isPurchased: z.boolean().optional(),
	completedThisYear: z.boolean().optional(),
	completedYearStart: z.number().int().optional(),
	completedYearEnd: z.number().int().optional(),
	sortBy: z.enum(ITEM_SORT_FIELDS).optional(),
	sortDirection: z.enum(["asc", "desc"] as const).optional(),
});

type LibrarySearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/_authenticated/_app/library")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => getLibrary({ data: deps }),
	component: LibraryPage,
});

function countActiveFilters(search: LibrarySearch): number {
	let count = 0;
	if (search.mediaTypes?.length) count += 1;
	if (search.statuses?.length) count += 1;
	if (search.isPurchased !== undefined) count += 1;
	if (
		search.completedThisYear ||
		search.completedYearStart !== undefined ||
		search.completedYearEnd !== undefined
	) {
		count += 1;
	}
	if (search.sortBy !== undefined && search.sortBy !== "title") count += 1;
	if (search.sortDirection !== undefined && search.sortDirection !== "asc") count += 1;
	return count;
}

function LibraryPage() {
	const mediaItems: LibraryItem[] = Route.useLoaderData();
	const search = Route.useSearch();
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [isFilterOpen, setIsFilterOpen] = useState(false);

	const activeFilterCount = countActiveFilters(search);

	function handleApply(filters: ViewFilters) {
		navigate({
			to: "/library",
			search: () => ({
				mediaTypes: filters.mediaTypes,
				statuses: filters.statuses,
				isPurchased: filters.isPurchased,
				completedThisYear: filters.completedThisYear,
				completedYearStart: filters.completedYearStart,
				completedYearEnd: filters.completedYearEnd,
				sortBy: filters.sortBy as LibrarySearch["sortBy"],
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
			<PageHeader title={t("library.title")} right={filterButton} />

			<LibraryFilterDialog
				isOpen={isFilterOpen}
				onClose={() => setIsFilterOpen(false)}
				initialFilters={search}
				onApply={handleApply}
			/>

			<main className="px-6 py-6">
				{mediaItems.length === 0 ? (
					<p className="text-muted-foreground text-center py-12">
						{t("library.empty")}
					</p>
				) : (
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
						{mediaItems.map((mediaItem) => (
							<MediaCard key={mediaItem.id} mediaItem={mediaItem} />
						))}
					</div>
				)}
			</main>
		</div>
	);
}
