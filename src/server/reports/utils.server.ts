import type { customReports } from "#/db/schema";
import type { MediaItemType } from "#/lib/enums";
import {
	type CustomReport,
	type DashboardReportType,
	REPORT_MONTH_OPTIONS,
	type ReportDataPoint,
	type ReportMonthOption,
} from "./types";

/**
 * This file uses the .server.ts convention — it must never be statically
 * imported by client-side code. Import it only from server function handler
 * bodies or other server-only modules.
 */

export function rowToCustomReport(
	row: typeof customReports.$inferSelect,
): CustomReport {
	return {
		id: row.id,
		name: row.name,
		reportType: row.reportType as DashboardReportType,
		mediaTypes: (row.mediaTypes as MediaItemType[] | null) ?? null,
		monthCount: (REPORT_MONTH_OPTIONS.includes(
			row.monthCount as ReportMonthOption,
		)
			? row.monthCount
			: 12) as ReportMonthOption,
	};
}

export function cutoffDateFromMonthCount(monthCount: number): string {
	const startDate = new Date();
	startDate.setMonth(startDate.getMonth() - (monthCount - 1));
	startDate.setDate(1);
	return startDate.toISOString().slice(0, 10);
}

/**
 * Builds an ascending array of the last N calendar months, pairing each with
 * its value from the provided rows. Months not present in rows default to 0.
 */
export function buildLastNMonths(
	rows: { month: string; value: number }[],
	monthCount: number,
): ReportDataPoint[] {
	const valueByMonth = new Map(rows.map((r) => [r.month, Number(r.value)]));
	const months: ReportDataPoint[] = [];
	const now = new Date();
	for (let offset = monthCount - 1; offset >= 0; offset--) {
		const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const key = `${year}-${month}`;
		months.push({ month: key, value: valueByMonth.get(key) ?? 0 });
	}
	return months;
}
