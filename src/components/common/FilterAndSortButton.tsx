import { useNavigate } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import type { FilterAndSortOptions, ViewSubject } from "#/db/schema";
import { LibraryFilterAndSortDialog } from "../library/LibraryFilterAndSortDialog";
import { Button } from "../ui/button";

interface FilterAndSortButtonProps {
	filterAndSortChoices: FilterAndSortOptions;
	isFilterAndSortPopupOpen: boolean;
	setIsFilterAndSortPopupOpen: Dispatch<SetStateAction<boolean>>;
	navigateTo: string;
	subject?: ViewSubject;
}

export function FilterAndSortButton({
	filterAndSortChoices,
	isFilterAndSortPopupOpen,
	setIsFilterAndSortPopupOpen,
	navigateTo = "/",
	subject = "items",
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
				size="icon"
				className={`sm:w-auto sm:px-4 gap-2${numberOfActiveFilters > 0 ? " w-auto px-2" : ""}`}
				onClick={() => setIsFilterAndSortPopupOpen(true)}
			>
				<SlidersHorizontal className="size-4 shrink-0" />
				<span className="sr-only sm:not-sr-only">
					{t("library.filterAndSort")}
				</span>
				{numberOfActiveFilters > 0 && (
					<span className="bg-primary text-primary-foreground rounded-full text-xs size-5 flex items-center justify-center shrink-0">
						{numberOfActiveFilters}
					</span>
				)}
			</Button>
			<LibraryFilterAndSortDialog
				isOpen={isFilterAndSortPopupOpen}
				onClose={() => setIsFilterAndSortPopupOpen(false)}
				initialFilters={filterAndSortChoices}
				onApply={handleApply}
				subject={subject}
			/>
		</>
	);
}

export function countActiveFilters(filterAndSortOptions: FilterAndSortOptions): number {
	let count = 0;
	if (filterAndSortOptions.mediaTypes?.length) count += 1;
	if (filterAndSortOptions.statuses?.length) count += 1;
	if (filterAndSortOptions.purchaseStatuses?.length) count += 1;
	if (
		filterAndSortOptions.completedThisYear ||
		filterAndSortOptions.completedDateStart !== undefined ||
		filterAndSortOptions.completedDateEnd !== undefined
	) {
		count += 1;
	}
	if (filterAndSortOptions.tags?.length) count += 1;
	if (filterAndSortOptions.genres?.length) count += 1;
	if (filterAndSortOptions.creatorQuery) count += 1;
	if (filterAndSortOptions.isSeriesComplete !== undefined) count += 1;
	return count;
}
