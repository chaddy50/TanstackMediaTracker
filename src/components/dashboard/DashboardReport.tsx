import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	type DashboardReport as DashboardReportData,
	type DashboardReportType,
	getDashboardReport,
	REPORT_MONTH_OPTIONS,
	type ReportDataPoint,
	type ReportMonthOption,
	setDashboardReport,
} from "#/server/reports";

function getYear(yearMonth: string): string {
	return yearMonth.split("-")[0] ?? "";
}

function spansMultipleYears(data: ReportDataPoint[]): boolean {
	if (data.length === 0) {
		return false;
	}
	const firstYear = getYear(data[0].month);
	return data.some((point) => getYear(point.month) !== firstYear);
}

type Props = {
	initialReport: DashboardReportData;
};

export function DashboardReport({ initialReport }: Props) {
	const { t } = useTranslation();
	const [reportType, setReportType] = useState<DashboardReportType>(
		initialReport.reportType,
	);
	const [reportMonths, setReportMonths] = useState<ReportMonthOption>(
		initialReport.reportMonths,
	);
	const [data, setData] = useState(initialReport.data);
	const [isLoading, setIsLoading] = useState(false);

	function getMonthAbbr(yearMonth: string): string {
		const [year, month] = yearMonth.split("-");
		const date = new Date(Number(year), Number(month) - 1, 1);
		return date.toLocaleString("default", { month: "short" });
	}

	function formatTick(yearMonth: string): string {
		if (!spansMultipleYears(data)) {
			return getMonthAbbr(yearMonth);
		}
		const year = getYear(yearMonth).slice(2); // e.g. "25"
		return `${getMonthAbbr(yearMonth)} '${year}`;
	}

	function formatTooltipLabel(yearMonth: string): string {
		return `${getMonthAbbr(yearMonth)} ${getYear(yearMonth)}`;
	}

	async function applyChange(
		newType?: DashboardReportType,
		newMonths?: ReportMonthOption,
	) {
		setIsLoading(true);
		try {
			await setDashboardReport({
				data: {
					...(newType !== undefined && { reportType: newType }),
					...(newMonths !== undefined && { reportMonths: newMonths }),
				},
			});
			const updated = await getDashboardReport();
			setReportType(updated.reportType);
			setReportMonths(updated.reportMonths);
			setData(updated.data);
		} finally {
			setIsLoading(false);
		}
	}

	function handleReportChange(newType: string) {
		applyChange(newType as DashboardReportType, undefined);
	}

	function handleMonthsChange(newMonths: string) {
		applyChange(undefined, parseInt(newMonths, 10) as ReportMonthOption);
	}

	const rangeLabelByMonths: Record<ReportMonthOption, string> = {
		3: t("dashboard.report.months.last3"),
		6: t("dashboard.report.months.last6"),
		12: t("dashboard.report.months.last12"),
		24: t("dashboard.report.months.last2Years"),
		60: t("dashboard.report.months.last5Years"),
	};

	const reportLabel =
		reportType === "pages_read_by_month"
			? t("dashboard.report.pagesReadByMonth")
			: t("dashboard.report.itemsCompletedByMonth");

	const tooltipLabel =
		reportType === "pages_read_by_month"
			? t("dashboard.report.pagesRead")
			: t("dashboard.report.itemsCompleted");

	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<div className="flex flex-wrap items-center justify-between gap-2 mb-4">
				<h2 className="text-base font-semibold text-card-foreground">
					{reportLabel}
				</h2>
				<div className="flex items-center gap-2">
					<Select
						value={String(reportMonths)}
						onValueChange={handleMonthsChange}
						disabled={isLoading}
					>
						<SelectTrigger className="w-36">
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
					<Select
						value={reportType}
						onValueChange={handleReportChange}
						disabled={isLoading}
					>
						<SelectTrigger className="w-52">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="pages_read_by_month">
								{t("dashboard.report.pagesReadByMonth")}
							</SelectItem>
							<SelectItem value="items_completed_by_month">
								{t("dashboard.report.itemsCompletedByMonth")}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
			<ResponsiveContainer width="100%" height={220}>
				<LineChart
					data={data}
					margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
				>
					<CartesianGrid
						strokeDasharray="3 3"
						stroke="var(--border)"
						vertical={false}
					/>
					<XAxis
						dataKey="month"
						tickFormatter={formatTick}
						tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
						axisLine={false}
						tickLine={false}
					/>
					<YAxis
						allowDecimals={false}
						tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
						axisLine={false}
						tickLine={false}
						width={36}
					/>
					<Tooltip
						formatter={(value) => [value, tooltipLabel]}
						labelFormatter={(label) => formatTooltipLabel(String(label))}
						contentStyle={{
							backgroundColor: "var(--card)",
							border: "1px solid var(--border)",
							borderRadius: "var(--radius)",
							fontSize: "12px",
							color: "var(--card-foreground)",
						}}
						cursor={{ stroke: "var(--border)" }}
					/>
					<Line
						type="monotone"
						dataKey="value"
						stroke="#69359c"
						strokeWidth={2}
						dot={{ r: 4, fill: "#69359c", strokeWidth: 0 }}
						activeDot={{ r: 6, fill: "#69359c", strokeWidth: 0 }}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
