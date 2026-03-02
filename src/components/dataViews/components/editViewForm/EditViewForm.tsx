import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { DeleteButton } from "#/components/common/DeleteButton";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Toggle } from "#/components/ui/toggle";
import type {
	ItemSortField,
	SeriesSortField,
	SortDirection,
	ViewFilters,
	ViewSubject,
} from "#/db/schema";
import type { MediaItemStatus, MediaItemType } from "#/lib/enums";
import {
	type CompletionDateMode,
	type PurchasedFilter,
	type SeriesCompleteFilter,
	ViewFiltersSection,
} from "./ViewFiltersSection";
import { ViewSortingSection } from "./ViewSortingSection";

interface ViewFormProps {
	initialName?: string;
	initialSubject?: ViewSubject;
	initialFilters?: ViewFilters;
	onSubmit: (data: {
		name: string;
		subject: ViewSubject;
		filters: ViewFilters;
	}) => void;
	onCancel: () => void;
	isSubmitting?: boolean;
	onDelete?: () => void;
	isDeleting?: boolean;
}

export function EditViewForm({
	initialName = "",
	initialSubject = "items",
	initialFilters = {},
	onSubmit,
	onCancel,
	isSubmitting = false,
	onDelete,
	isDeleting = false,
}: ViewFormProps) {
	const { t } = useTranslation();
	const nameInputId = useId();

	const [name, setName] = useState(initialName);
	const [subject, setSubject] = useState<ViewSubject>(initialSubject);
	const [selectedMediaTypes, setSelectedMediaTypes] = useState<MediaItemType[]>(
		initialFilters.mediaTypes ?? [],
	);
	const [selectedStatuses, setSelectedStatuses] = useState<MediaItemStatus[]>(
		initialFilters.statuses ?? [],
	);

	// Items-only filters
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
	const [yearStart, setYearStart] = useState<string>(
		initialFilters.completedYearStart?.toString() ?? "",
	);
	const [yearEnd, setYearEnd] = useState<string>(
		initialFilters.completedYearEnd?.toString() ?? "",
	);

	// Series-only filters
	const [seriesCompleteFilter, setSeriesCompleteFilter] =
		useState<SeriesCompleteFilter>(
			initialFilters.isSeriesComplete === true
				? "complete"
				: initialFilters.isSeriesComplete === false
					? "incomplete"
					: "all",
		);

	// Sort
	const defaultSortBy: ItemSortField | SeriesSortField =
		initialSubject === "series" ? "name" : "updatedAt";
	const defaultSortDirection: SortDirection =
		initialSubject === "series" ? "asc" : "desc";
	const [sortBy, setSortBy] = useState<ItemSortField | SeriesSortField>(
		initialFilters.sortBy ?? defaultSortBy,
	);
	const [sortDirection, setSortDirection] = useState<SortDirection>(
		initialFilters.sortDirection ?? defaultSortDirection,
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

	function handleSubjectChange(newSubject: ViewSubject) {
		setSubject(newSubject);
		setSelectedStatuses([]);
		setSortBy(newSubject === "series" ? "name" : "updatedAt");
		setSortDirection(newSubject === "series" ? "asc" : "desc");
	}

	function handleSubmit() {
		const filters: ViewFilters = {};

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

		onSubmit({ name, subject, filters });
	}

	return (
		<div className="flex flex-col gap-5">
			{/* Name */}
			<div className="flex flex-col gap-1.5">
				<Label htmlFor={nameInputId}>{t("views.form.name")}</Label>
				<Input
					id={nameInputId}
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder={t("views.form.namePlaceholder")}
				/>
			</div>

			{/* Subject */}
			<div className="flex flex-col gap-1.5">
				<Label>{t("views.form.subject")}</Label>
				<div className="flex gap-2">
					<Toggle
						variant="outline"
						pressed={subject === "items"}
						onPressedChange={() => handleSubjectChange("items")}
					>
						{t("views.subject.items")}
					</Toggle>
					<Toggle
						variant="outline"
						pressed={subject === "series"}
						onPressedChange={() => handleSubjectChange("series")}
					>
						{t("views.subject.series")}
					</Toggle>
				</div>
			</div>

			<ViewFiltersSection
				subject={subject}
				selectedMediaTypes={selectedMediaTypes}
				onToggleMediaType={toggleMediaType}
				selectedStatuses={selectedStatuses}
				onToggleStatus={toggleStatus}
				purchasedFilter={purchasedFilter}
				onPurchasedFilterChange={setPurchasedFilter}
				completionDateMode={completionDateMode}
				onCompletionDateModeChange={setCompletionDateMode}
				yearStart={yearStart}
				onYearStartChange={setYearStart}
				yearEnd={yearEnd}
				onYearEndChange={setYearEnd}
				seriesCompleteFilter={seriesCompleteFilter}
				onSeriesCompleteFilterChange={setSeriesCompleteFilter}
			/>

			<ViewSortingSection
				subject={subject}
				sortBy={sortBy}
				onSortByChange={setSortBy}
				sortDirection={sortDirection}
				onSortDirectionChange={setSortDirection}
			/>

			{/* Actions */}
			<div className="flex items-center justify-between pt-2">
				<div>
					{onDelete && (
						<DeleteButton onClick={onDelete} disabled={isDeleting}>
							{t("views.deleteView")}
						</DeleteButton>
					)}
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
						{t("mediaItemDetails.cancel")}
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={isSubmitting || name.trim().length === 0}
					>
						{isSubmitting ? t("views.form.saving") : t("mediaItemDetails.save")}
					</Button>
				</div>
			</div>
		</div>
	);
}
