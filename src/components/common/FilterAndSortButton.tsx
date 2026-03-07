import type { FilterAndSortOptions } from "#/db/schema";
import { useNavigate } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { LibraryFilterAndSortDialog } from "../library/LibraryFilterAndSortDialog";
import { Button } from "../ui/button";

interface FilterAndSortButtonProps {
	filterAndSortChoices: FilterAndSortOptions;
	isFilterAndSortPopupOpen: boolean;
	setIsFilterAndSortPopupOpen: Dispatch<SetStateAction<boolean>>;
	navigateTo: string;
}

export function FilterAndSortButton({
	filterAndSortChoices,
	isFilterAndSortPopupOpen,
	setIsFilterAndSortPopupOpen,
	navigateTo = "/",
}: FilterAndSortButtonProps) {
	const { t } = useTranslation();
	const numberOfActiveFilters = countActiveFilters(filterAndSortChoices);
	const navigate = useNavigate();

	function handleApply(filters: FilterAndSortOptions) {
		navigate({ to: navigateTo, search: () => filters });
	}

	return (
		<>
			<Button
				variant="outline"
				onClick={() => setIsFilterAndSortPopupOpen(true)}
				className="gap-2"
			>
				<SlidersHorizontal />
				{t("library.filterAndSort")}
				{numberOfActiveFilters > 0 && (
					<span className="bg-primary text-primary-foreground rounded-full text-xs size-5 flex items-center justify-center">
						{numberOfActiveFilters}
					</span>
				)}
			</Button>
			<LibraryFilterAndSortDialog
				isOpen={isFilterAndSortPopupOpen}
				onClose={() => setIsFilterAndSortPopupOpen(false)}
				initialFilters={filterAndSortChoices}
				onApply={handleApply}
			/>
		</>
	);
}

function countActiveFilters(
	filterAndSortOptions: FilterAndSortOptions,
): number {
	let count = 0;
	if (filterAndSortOptions.mediaTypes?.length) count += 1;
	if (filterAndSortOptions.statuses?.length) count += 1;
	if (filterAndSortOptions.isPurchased !== undefined) count += 1;
	if (
		filterAndSortOptions.completedThisYear ||
		filterAndSortOptions.completedYearStart !== undefined ||
		filterAndSortOptions.completedYearEnd !== undefined
	) {
		count += 1;
	}
	if (
		filterAndSortOptions.sortBy !== undefined &&
		filterAndSortOptions.sortBy !== "series"
	)
		count += 1;
	if (
		filterAndSortOptions.sortDirection !== undefined &&
		filterAndSortOptions.sortDirection !== "asc"
	)
		count += 1;
	return count;
}
