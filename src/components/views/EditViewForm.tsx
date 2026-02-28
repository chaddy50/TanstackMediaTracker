import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { DeleteButton } from "#/components/common/DeleteButton";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Toggle } from "#/components/ui/toggle";
import type { ViewFilters, ViewSubject } from "#/db/schema";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";

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

const ITEM_STATUSES = [
	MediaItemStatus.BACKLOG,
	MediaItemStatus.NEXT_UP,
	MediaItemStatus.IN_PROGRESS,
	MediaItemStatus.ON_HOLD,
	MediaItemStatus.COMPLETED,
	MediaItemStatus.DROPPED,
] as const;

const SERIES_STATUSES = [
	MediaItemStatus.BACKLOG,
	MediaItemStatus.IN_PROGRESS,
	MediaItemStatus.ON_HOLD,
	MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
	MediaItemStatus.COMPLETED,
	MediaItemStatus.DROPPED,
] as const;

const MEDIA_TYPES = [
	MediaItemType.BOOK,
	MediaItemType.MOVIE,
	MediaItemType.TV_SHOW,
	MediaItemType.VIDEO_GAME,
] as const;

type PurchasedFilter = "all" | "owned" | "not-owned";
type SeriesCompleteFilter = "all" | "complete" | "incomplete";
type CompletionDateMode = "none" | "this-year" | "range";

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

		onSubmit({ name, subject, filters });
	}

	const statusOptions = subject === "items" ? ITEM_STATUSES : SERIES_STATUSES;

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

			{/* Media types */}
			<div className="flex flex-col gap-1.5">
				<Label>{t("views.form.mediaTypes")}</Label>
				<div className="flex gap-2 flex-wrap">
					{MEDIA_TYPES.map((type) => (
						<Toggle
							key={type}
							variant="outline"
							pressed={selectedMediaTypes.includes(type)}
							onPressedChange={() => toggleMediaType(type)}
						>
							{t(`mediaType.${type}`)}
						</Toggle>
					))}
				</div>
			</div>

			{/* Statuses */}
			<div className="flex flex-col gap-1.5">
				<Label>{t("views.form.statuses")}</Label>
				<div className="flex gap-2 flex-wrap">
					{statusOptions.map((status) => (
						<Toggle
							key={status}
							variant="outline"
							pressed={selectedStatuses.includes(status)}
							onPressedChange={() => toggleStatus(status)}
						>
							{t(`status.${status}`)}
						</Toggle>
					))}
				</div>
			</div>

			{/* Items-only filters */}
			{subject === "items" && (
				<>
					<div className="flex flex-col gap-1.5">
						<Label>{t("views.form.purchased")}</Label>
						<div className="flex gap-2">
							{(["all", "owned", "not-owned"] as PurchasedFilter[]).map(
								(option) => (
									<Toggle
										key={option}
										variant="outline"
										pressed={purchasedFilter === option}
										onPressedChange={() => setPurchasedFilter(option)}
									>
										{t(`views.form.purchasedOption.${option}`)}
									</Toggle>
								),
							)}
						</div>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label>{t("views.form.completionDate")}</Label>
						<div className="flex gap-2 flex-wrap">
							{(["none", "this-year", "range"] as CompletionDateMode[]).map(
								(mode) => (
									<Toggle
										key={mode}
										variant="outline"
										pressed={completionDateMode === mode}
										onPressedChange={() => setCompletionDateMode(mode)}
									>
										{t(`views.form.completionDateOption.${mode}`)}
									</Toggle>
								),
							)}
						</div>
						{completionDateMode === "range" && (
							<div className="flex items-center gap-2 mt-2">
								<Input
									type="number"
									placeholder={t("views.form.yearFrom")}
									value={yearStart}
									onChange={(e) => setYearStart(e.target.value)}
									className="w-28"
								/>
								<span className="text-muted-foreground">—</span>
								<Input
									type="number"
									placeholder={t("views.form.yearTo")}
									value={yearEnd}
									onChange={(e) => setYearEnd(e.target.value)}
									className="w-28"
								/>
							</div>
						)}
					</div>
				</>
			)}

			{/* Series-only filters */}
			{subject === "series" && (
				<div className="flex flex-col gap-1.5">
					<Label>{t("views.form.seriesCompletion")}</Label>
					<div className="flex gap-2">
						{(["all", "complete", "incomplete"] as SeriesCompleteFilter[]).map(
							(option) => (
								<Toggle
									key={option}
									variant="outline"
									pressed={seriesCompleteFilter === option}
									onPressedChange={() => setSeriesCompleteFilter(option)}
								>
									{t(`views.form.seriesCompletionOption.${option}`)}
								</Toggle>
							),
						)}
					</div>
				</div>
			)}

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
