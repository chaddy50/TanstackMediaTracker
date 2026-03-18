import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { MultiSelectFilter } from "#/components/ui/multi-select-filter";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { MediaItemType } from "#/lib/enums";
import {
	type CustomReport,
	type DashboardReportType,
	REPORT_MONTH_OPTIONS,
	type ReportMonthOption,
} from "#/server/reports/types";

const ALL_MEDIA_TYPES = [
	MediaItemType.BOOK,
	MediaItemType.MOVIE,
	MediaItemType.TV_SHOW,
	MediaItemType.VIDEO_GAME,
	MediaItemType.PODCAST,
] as const;

type Props = {
	initial?: CustomReport;
	onSave: (data: {
		name: string;
		reportType: DashboardReportType;
		mediaTypes: MediaItemType[] | null;
		monthCount: ReportMonthOption;
	}) => Promise<void>;
	onCancel: () => void;
};

export function CreateEditReportForm({ initial, onSave, onCancel }: Props) {
	const { t } = useTranslation();
	const [name, setName] = useState(initial?.name ?? "");
	const [reportType, setReportType] = useState<DashboardReportType>(
		initial?.reportType ?? "progress_by_month",
	);
	const [monthCount, setMonthCount] = useState<ReportMonthOption>(
		initial?.monthCount ?? 12,
	);

	// For progress_by_month: single type (stored as one-element array)
	// For others: multi-select (null = all types)
	const [singleMediaType, setSingleMediaType] = useState<MediaItemType>(
		initial?.reportType === "progress_by_month"
			? (initial.mediaTypes?.[0] ?? MediaItemType.BOOK)
			: MediaItemType.BOOK,
	);
	const [multiMediaTypes, setMultiMediaTypes] = useState<MediaItemType[]>(
		initial?.reportType !== "progress_by_month"
			? ((initial?.mediaTypes as MediaItemType[] | null) ?? [])
			: [],
	);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const nameInputId = useId();

	const isProgressByMonth = reportType === "progress_by_month";

	function handleReportTypeChange(newType: DashboardReportType) {
		setReportType(newType);
	}

	function handleMultiTypeToggle(mediaType: MediaItemType) {
		setMultiMediaTypes((previous) => {
			if (previous.includes(mediaType)) {
				return previous.filter((t) => t !== mediaType);
			} else {
				return [...previous, mediaType];
			}
		});
	}

	async function handleSubmit() {
		if (!name.trim()) {
			return;
		}
		setIsSubmitting(true);
		try {
			const mediaTypes = isProgressByMonth
				? [singleMediaType]
				: multiMediaTypes.length > 0
					? multiMediaTypes
					: null;
			await onSave({ name: name.trim(), reportType, mediaTypes, monthCount });
		} finally {
			setIsSubmitting(false);
		}
	}

	const reportTypeLabel: Record<DashboardReportType, string> = {
		progress_by_month: t("dashboard.report.progressByMonth"),
		items_completed_by_month: t("dashboard.report.itemsCompletedByMonth"),
		items_completed_by_genre: t("dashboard.report.itemsCompletedByGenre"),
		avg_score_by_genre: t("dashboard.report.avgScoreByGenre"),
	};

	const mediaTypeLabel: Record<MediaItemType, string> = {
		[MediaItemType.BOOK]: t("mediaType.book"),
		[MediaItemType.MOVIE]: t("mediaType.movie"),
		[MediaItemType.TV_SHOW]: t("mediaType.tv_show"),
		[MediaItemType.VIDEO_GAME]: t("mediaType.video_game"),
		[MediaItemType.PODCAST]: t("mediaType.podcast"),
	};

	const rangeLabelByMonths: Record<ReportMonthOption, string> = {
		3: t("dashboard.report.months.last3"),
		6: t("dashboard.report.months.last6"),
		12: t("dashboard.report.months.last12"),
		24: t("dashboard.report.months.last2Years"),
		60: t("dashboard.report.months.last5Years"),
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-1.5">
				<Label htmlFor={nameInputId}>{t("dashboard.report.reportName")}</Label>
				<Input
					id={nameInputId}
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder={t("dashboard.report.reportName")}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label>{t("dashboard.report.reportType")}</Label>
				<Select
					value={reportType}
					onValueChange={(value) =>
						handleReportTypeChange(value as DashboardReportType)
					}
				>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{(Object.keys(reportTypeLabel) as DashboardReportType[]).map(
							(type) => (
								<SelectItem key={type} value={type}>
									{reportTypeLabel[type]}
								</SelectItem>
							),
						)}
					</SelectContent>
				</Select>
			</div>

			{isProgressByMonth ? (
				<div className="flex flex-col gap-1.5">
					<Label>{t("dashboard.report.mediaType")}</Label>
					<Select
						value={singleMediaType}
						onValueChange={(value) =>
							setSingleMediaType(value as MediaItemType)
						}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{ALL_MEDIA_TYPES.map((type) => (
								<SelectItem key={type} value={type}>
									{mediaTypeLabel[type]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			) : (
				<div className="flex flex-col gap-1.5">
					<Label>{t("dashboard.report.mediaTypes")}</Label>
					<MultiSelectFilter
						label={t("dashboard.report.allMediaTypes")}
						options={ALL_MEDIA_TYPES.map((type) => ({
							value: type,
							label: mediaTypeLabel[type],
						}))}
						selectedValues={multiMediaTypes}
						onToggle={(value) => handleMultiTypeToggle(value as MediaItemType)}
					/>
				</div>
			)}

			<div className="flex flex-col gap-1.5">
				<Label>{t("dashboard.report.monthCount")}</Label>
				<Select
					value={String(monthCount)}
					onValueChange={(value) =>
						setMonthCount(parseInt(value, 10) as ReportMonthOption)
					}
				>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{REPORT_MONTH_OPTIONS.map((months) => (
							<SelectItem key={months} value={String(months)}>
								{rangeLabelByMonths[months]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex justify-end gap-2 pt-1">
				<Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
					{t("common.cancel")}
				</Button>
				<Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
					{t("common.save")}
				</Button>
			</div>
		</div>
	);
}
