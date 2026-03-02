import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Toggle } from "#/components/ui/toggle";
import type { ViewSubject } from "#/db/schema";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";
import { useTranslation } from "react-i18next";

export type PurchasedFilter = "all" | "owned" | "not-owned";
export type SeriesCompleteFilter = "all" | "complete" | "incomplete";
export type CompletionDateMode = "none" | "this-year" | "range";

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

interface ViewFiltersSectionProps {
	subject: ViewSubject;
	selectedMediaTypes: MediaItemType[];
	onToggleMediaType: (type: MediaItemType) => void;
	selectedStatuses: MediaItemStatus[];
	onToggleStatus: (status: MediaItemStatus) => void;
	purchasedFilter: PurchasedFilter;
	onPurchasedFilterChange: (filter: PurchasedFilter) => void;
	completionDateMode: CompletionDateMode;
	onCompletionDateModeChange: (mode: CompletionDateMode) => void;
	yearStart: string;
	onYearStartChange: (year: string) => void;
	yearEnd: string;
	onYearEndChange: (year: string) => void;
	seriesCompleteFilter: SeriesCompleteFilter;
	onSeriesCompleteFilterChange: (filter: SeriesCompleteFilter) => void;
}

export function ViewFiltersSection({
	subject,
	selectedMediaTypes,
	onToggleMediaType,
	selectedStatuses,
	onToggleStatus,
	purchasedFilter,
	onPurchasedFilterChange,
	completionDateMode,
	onCompletionDateModeChange,
	yearStart,
	onYearStartChange,
	yearEnd,
	onYearEndChange,
	seriesCompleteFilter,
	onSeriesCompleteFilterChange,
}: ViewFiltersSectionProps) {
	const { t } = useTranslation();
	const statusOptions = subject === "items" ? ITEM_STATUSES : SERIES_STATUSES;

	return (
		<div className="border-t border-border pt-4 flex flex-col gap-4">
			<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
				{t("views.form.filtersSection")}
			</p>

			<div className="flex flex-col gap-1.5">
				<Label>{t("views.form.mediaTypes")}</Label>
				<div className="flex gap-2 flex-wrap">
					{MEDIA_TYPES.map((type) => (
						<Toggle
							key={type}
							variant="outline"
							pressed={selectedMediaTypes.includes(type)}
							onPressedChange={() => onToggleMediaType(type)}
						>
							{t(`mediaType.${type}`)}
						</Toggle>
					))}
				</div>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label>{t("views.form.statuses")}</Label>
				<div className="flex gap-2 flex-wrap">
					{statusOptions.map((status) => (
						<Toggle
							key={status}
							variant="outline"
							pressed={selectedStatuses.includes(status)}
							onPressedChange={() => onToggleStatus(status)}
						>
							{t(`status.${status}`)}
						</Toggle>
					))}
				</div>
			</div>

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
										onPressedChange={() => onPurchasedFilterChange(option)}
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
										onPressedChange={() => onCompletionDateModeChange(mode)}
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
									onChange={(e) => onYearStartChange(e.target.value)}
									className="w-28"
								/>
								<span className="text-muted-foreground">—</span>
								<Input
									type="number"
									placeholder={t("views.form.yearTo")}
									value={yearEnd}
									onChange={(e) => onYearEndChange(e.target.value)}
									className="w-28"
								/>
							</div>
						)}
					</div>
				</>
			)}

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
									onPressedChange={() => onSeriesCompleteFilterChange(option)}
								>
									{t(`views.form.seriesCompletionOption.${option}`)}
								</Toggle>
							),
						)}
					</div>
				</div>
			)}
		</div>
	);
}
