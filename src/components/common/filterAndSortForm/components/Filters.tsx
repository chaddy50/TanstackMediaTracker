import { useTranslation } from "react-i18next";

import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { MultiSelectFilter } from "#/components/ui/multi-select-filter";
import { Toggle } from "#/components/ui/toggle";
import type { ViewSubject } from "#/db/schema";
import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/server/enums";

export type SeriesCompleteFilter = "all" | "complete" | "incomplete";
export type CompletionDateMode = "none" | "this-year" | "range";

const ITEM_STATUSES = [
	MediaItemStatus.BACKLOG,
	MediaItemStatus.NEXT_UP,
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
	MediaItemType.PODCAST,
] as const;

const PURCHASE_STATUSES = [
	PurchaseStatus.NOT_PURCHASED,
	PurchaseStatus.WANT_TO_BUY,
	PurchaseStatus.PURCHASED,
] as const;

export interface FiltersProps {
	subject: ViewSubject;
	selectedMediaTypes: MediaItemType[];
	onToggleMediaType: (type: MediaItemType) => void;
	selectedStatuses: MediaItemStatus[];
	onToggleStatus: (status: MediaItemStatus) => void;
	selectedPurchaseStatuses: PurchaseStatus[];
	onTogglePurchaseStatus: (status: PurchaseStatus) => void;
	completionDateMode: CompletionDateMode;
	onCompletionDateModeChange: (mode: CompletionDateMode) => void;
	dateStart: string;
	onDateStartChange: (date: string) => void;
	dateEnd: string;
	onDateEndChange: (date: string) => void;
	seriesCompleteFilter: SeriesCompleteFilter;
	onSeriesCompleteFilterChange: (filter: SeriesCompleteFilter) => void;
	availableTags: string[];
	selectedTags: string[];
	onToggleTag: (tag: string) => void;
	availableGenres: string[];
	selectedGenres: string[];
	onToggleGenre: (genre: string) => void;
	creatorQuery: string;
	onCreatorQueryChange: (query: string) => void;
}

export function Filters({
	subject,
	selectedMediaTypes,
	onToggleMediaType,
	selectedStatuses,
	onToggleStatus,
	selectedPurchaseStatuses,
	onTogglePurchaseStatus,
	completionDateMode,
	onCompletionDateModeChange,
	dateStart,
	onDateStartChange,
	dateEnd,
	onDateEndChange,
	seriesCompleteFilter,
	onSeriesCompleteFilterChange,
	availableTags,
	selectedTags,
	onToggleTag,
	availableGenres,
	selectedGenres,
	onToggleGenre,
	creatorQuery,
	onCreatorQueryChange,
}: FiltersProps) {
	const { t } = useTranslation();

	return (
		<div className="border-t border-border pt-4 flex flex-col gap-4">
			<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
				{t("views.form.filtersSection")}
			</p>

			<div className="flex flex-col gap-1.5">
				<Label>{t("views.form.mediaTypes")}</Label>
				<MultiSelectFilter
					label={t("views.form.mediaTypes")}
					options={MEDIA_TYPES.map((type) => ({
						value: type,
						label: t(`mediaType.${type}`),
					}))}
					selectedValues={selectedMediaTypes as string[]}
					onToggle={(value) => onToggleMediaType(value as MediaItemType)}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label>{t("views.form.statuses")}</Label>
				<MultiSelectFilter
					label={t("views.form.statuses")}
					options={ITEM_STATUSES.map((status) => ({
						value: status,
						label: t(`status.${status}`),
					}))}
					selectedValues={selectedStatuses as string[]}
					onToggle={(value) => onToggleStatus(value as MediaItemStatus)}
				/>
			</div>

			{subject === "items" && (
				<>
					<div className="flex flex-col gap-1.5">
						<Label>{t("views.form.purchased")}</Label>
						<MultiSelectFilter
							label={t("views.form.purchased")}
							options={PURCHASE_STATUSES.map((option) => ({
								value: option,
								label: t(`views.form.purchasedOption.${option}`),
							}))}
							selectedValues={selectedPurchaseStatuses as string[]}
							onToggle={(value) => onTogglePurchaseStatus(value as PurchaseStatus)}
						/>
					</div>

					{availableTags.length > 0 && (
						<div className="flex flex-col gap-1.5">
							<Label>{t("views.form.tags")}</Label>
							<MultiSelectFilter
								label={t("views.form.tags")}
								options={availableTags.map((tag) => ({ value: tag, label: tag }))}
								selectedValues={selectedTags}
								onToggle={onToggleTag}
							/>
						</div>
					)}

					{availableGenres.length > 0 && (
						<div className="flex flex-col gap-1.5">
							<Label>{t("views.form.genres")}</Label>
							<MultiSelectFilter
								label={t("views.form.genres")}
								options={availableGenres.map((genre) => ({ value: genre, label: genre }))}
								selectedValues={selectedGenres}
								onToggle={onToggleGenre}
							/>
						</div>
					)}

					<div className="flex flex-col gap-1.5">
						<Label>{t("views.form.creatorFilter")}</Label>
						<Input
							value={creatorQuery}
							onChange={(e) => onCreatorQueryChange(e.target.value)}
							placeholder={t("views.form.creatorFilterPlaceholder")}
						/>
					</div>
				</>
			)}

			{subject === "series" && (
				<div className="flex flex-col gap-1.5">
					<Label>{t("views.form.seriesCompletion")}</Label>
					<div className="flex gap-2">
						{(["complete", "incomplete"] as const).map((option) => (
							<Toggle
								key={option}
								variant="outline"
								pressed={seriesCompleteFilter === option}
								onPressedChange={(pressed) => {
									if (pressed) {
										onSeriesCompleteFilterChange(option);
									} else {
										onSeriesCompleteFilterChange("all");
									}
								}}
							>
								{t(`views.form.seriesCompletionOption.${option}`)}
							</Toggle>
						))}
					</div>
				</div>
			)}

			{subject === "items" && (
				<div className="flex flex-col gap-1.5">
					<Label>{t("views.form.completionDate")}</Label>
					<div className="flex gap-2 flex-wrap">
						{(["this-year", "range"] as const).map((mode) => (
							<Toggle
								key={mode}
								variant="outline"
								pressed={completionDateMode === mode}
								onPressedChange={(pressed) => {
									if (pressed) {
										onCompletionDateModeChange(mode);
									} else {
										onCompletionDateModeChange("none");
									}
								}}
							>
								{t(`views.form.completionDateOption.${mode}`)}
							</Toggle>
						))}
					</div>
					{completionDateMode === "range" && (
						<div className="flex items-center gap-2 mt-2">
							<Input
								type="date"
								placeholder={t("views.form.dateFrom")}
								value={dateStart}
								onChange={(e) => onDateStartChange(e.target.value)}
								className="w-40"
							/>
							<span className="text-muted-foreground">—</span>
							<Input
								type="date"
								placeholder={t("views.form.dateTo")}
								value={dateEnd}
								onChange={(e) => onDateEndChange(e.target.value)}
								className="w-40"
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
