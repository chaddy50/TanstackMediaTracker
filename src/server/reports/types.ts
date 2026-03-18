import type { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";

export type DashboardReportType =
	| "progress_by_month"
	| "items_completed_by_month"
	| "items_completed_by_genre"
	| "avg_score_by_genre";

export const REPORT_MONTH_OPTIONS = [3, 6, 12, 24, 60] as const;
export type ReportMonthOption = (typeof REPORT_MONTH_OPTIONS)[number];

export type ReportDataPoint = {
	month: string; // "YYYY-MM"
	value: number;
};

export type GenreDataPoint = {
	genre: string;
	value: number;
};

export type CustomReport = {
	id: number;
	name: string;
	reportType: DashboardReportType;
	mediaTypes: MediaItemType[] | null; // null = all types; progress_by_month always has exactly one
	monthCount: ReportMonthOption;
};

export type DrillDownItem = {
	id: number;
	status: MediaItemStatus;
	purchaseStatus: PurchaseStatus;
	title: string;
	type: MediaItemType;
	coverImageUrl: string | null;
	rating: number;
	completedAt: string | null;
	expectedReleaseDate: string | null;
	seriesId: number | null;
	seriesName: string | null;
};

export type DashboardReport = {
	customReports: CustomReport[];
	activeReport: CustomReport | null;
	data: ReportDataPoint[] | GenreDataPoint[];
};

export type DrillDownItemsResult = DrillDownItem[];
