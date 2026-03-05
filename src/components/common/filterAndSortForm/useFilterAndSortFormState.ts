import type {
	ItemSortField,
	SeriesSortField,
	SortDirection,
	FilterAndSortOptions,
	ViewSubject,
} from "#/db/schema";
import type { MediaItemStatus, MediaItemType } from "#/lib/enums";
import { useState } from "react";
import type {
	CompletionDateMode,
	FiltersProps,
	PurchasedFilter,
	SeriesCompleteFilter,
} from "./components/Filters";
import type { SortingOptionsProps } from "./components/SortingOptions";

export function useFilterAndSortFormState(
	initialSubject: ViewSubject,
	initialFilters: FilterAndSortOptions = {},
	availableTags: string[] = [],
) {
	const [subject, setSubject] = useState<ViewSubject>(initialSubject);
	const [selectedMediaTypes, setSelectedMediaTypes] = useState<MediaItemType[]>(
		initialFilters.mediaTypes ?? [],
	);
	const [selectedStatuses, setSelectedStatuses] = useState<MediaItemStatus[]>(
		initialFilters.statuses ?? [],
	);
	const [purchasedFilter, setPurchasedFilter] = useState<PurchasedFilter>(
		initialFilters.isPurchased === true
			? "owned"
			: initialFilters.isPurchased === false
				? "not-owned"
				: "all",
	);
	const [completionDateMode, setCompletionDateMode] =
		useState<CompletionDateMode>(
			initialFilters.completedThisYear
				? "this-year"
				: initialFilters.completedYearStart !== undefined ||
						initialFilters.completedYearEnd !== undefined
					? "range"
					: "none",
		);
	const [yearStart, setYearStart] = useState(
		initialFilters.completedYearStart?.toString() ?? "",
	);
	const [yearEnd, setYearEnd] = useState(
		initialFilters.completedYearEnd?.toString() ?? "",
	);
	const [seriesCompleteFilter, setSeriesCompleteFilter] =
		useState<SeriesCompleteFilter>(
			initialFilters.isSeriesComplete === true
				? "complete"
				: initialFilters.isSeriesComplete === false
					? "incomplete"
					: "all",
		);
	const [selectedTags, setSelectedTags] = useState<string[]>(
		initialFilters.tags ?? [],
	);
	const [sortBy, setSortBy] = useState<ItemSortField | SeriesSortField>(
		initialFilters.sortBy ?? (initialSubject === "series" ? "name" : "title"),
	);
	const [sortDirection, setSortDirection] = useState<SortDirection>(
		initialFilters.sortDirection ?? "asc",
	);

	function toggleMediaType(type: MediaItemType) {
		setSelectedMediaTypes((previous) =>
			previous.includes(type)
				? previous.filter((t) => t !== type)
				: [...previous, type],
		);
	}

	function toggleStatus(status: MediaItemStatus) {
		setSelectedStatuses((previous) =>
			previous.includes(status)
				? previous.filter((s) => s !== status)
				: [...previous, status],
		);
	}

	function toggleTag(tag: string) {
		setSelectedTags((previous) =>
			previous.includes(tag)
				? previous.filter((t) => t !== tag)
				: [...previous, tag],
		);
	}

	function onSubjectChanged(newSubject: ViewSubject) {
		setSubject(newSubject);
		setSelectedStatuses([]);
		setSortBy(newSubject === "series" ? "name" : "title");
		setSortDirection("asc");
	}

	function buildFilters(): FilterAndSortOptions {
		const filters: FilterAndSortOptions = {};

		if (selectedMediaTypes.length > 0) {
			filters.mediaTypes = selectedMediaTypes;
		}
		if (selectedStatuses.length > 0) {
			filters.statuses = selectedStatuses;
		}

		if (subject === "items") {
			if (purchasedFilter === "owned") {
				filters.isPurchased = true;
			} else if (purchasedFilter === "not-owned") {
				filters.isPurchased = false;
			}

			if (completionDateMode === "this-year") {
				filters.completedThisYear = true;
			} else if (completionDateMode === "range") {
				const parsedStart = parseInt(yearStart, 10);
				const parsedEnd = parseInt(yearEnd, 10);
				if (!Number.isNaN(parsedStart)) {
					filters.completedYearStart = parsedStart;
				}
				if (!Number.isNaN(parsedEnd)) {
					filters.completedYearEnd = parsedEnd;
				}
			}

			if (selectedTags.length > 0) {
				filters.tags = selectedTags;
			}
		}

		if (subject === "series") {
			if (seriesCompleteFilter === "complete") {
				filters.isSeriesComplete = true;
			} else if (seriesCompleteFilter === "incomplete") {
				filters.isSeriesComplete = false;
			}
		}

		filters.sortBy = sortBy;
		filters.sortDirection = sortDirection;

		return filters;
	}

	const filtersProps: FiltersProps = {
		subject,
		selectedMediaTypes,
		onToggleMediaType: toggleMediaType,
		selectedStatuses,
		onToggleStatus: toggleStatus,
		purchasedFilter,
		onPurchasedFilterChange: setPurchasedFilter,
		completionDateMode,
		onCompletionDateModeChange: setCompletionDateMode,
		yearStart,
		onYearStartChange: setYearStart,
		yearEnd,
		onYearEndChange: setYearEnd,
		seriesCompleteFilter,
		onSeriesCompleteFilterChange: setSeriesCompleteFilter,
		availableTags,
		selectedTags,
		onToggleTag: toggleTag,
	};

	const sortingProps: SortingOptionsProps = {
		subject,
		sortBy,
		onSortByChange: setSortBy,
		sortDirection,
		onSortDirectionChange: setSortDirection,
	};

	return {
		subject,
		onSubjectChanged,
		filtersProps,
		sortingProps,
		buildFilters,
	};
}
