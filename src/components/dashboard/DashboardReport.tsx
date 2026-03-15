import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Label,
	Line,
	LineChart,
	Pie,
	PieChart,
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
	type GenreDataPoint,
	getDashboardReport,
	REPORT_MONTH_OPTIONS,
	type ReportDataPoint,
	type ReportMonthOption,
	setDashboardReport,
} from "#/server/reports";

const PIE_COLORS = [
	"#69359c",
	"#a855f7",
	"#3b82f6",
	"#10b981",
	"#f59e0b",
	"#ef4444",
	"#8b5cf6",
	"#06b6d4",
	"#ec4899",
	"#14b8a6",
];

const TOOLTIP_CONTENT_STYLE = {
	backgroundColor: "var(--card)",
	border: "1px solid var(--border)",
	borderRadius: "var(--radius)",
	fontSize: "12px",
	color: "var(--card-foreground)",
};

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
	const [data, setData] = useState<ReportDataPoint[] | GenreDataPoint[]>(
		initialReport.data,
	);
	const [isLoading, setIsLoading] = useState(false);


	function getMonthAbbr(yearMonth: string): string {
		const [year, month] = yearMonth.split("-");
		const date = new Date(Number(year), Number(month) - 1, 1);
		return date.toLocaleString("default", { month: "short" });
	}

	function formatTick(yearMonth: string): string {
		const timeData = data as ReportDataPoint[];
		if (!spansMultipleYears(timeData)) {
			return getMonthAbbr(yearMonth);
		}
		const year = getYear(yearMonth).slice(2);
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

	const reportLabel: Record<DashboardReportType, string> = {
		pages_read_by_month: t("dashboard.report.pagesReadByMonth"),
		items_completed_by_month: t("dashboard.report.itemsCompletedByMonth"),
		books_completed_by_genre: t("dashboard.report.booksCompletedByGenre"),
		avg_score_by_genre: t("dashboard.report.avgScoreByGenre"),
	};

	const tooltipValueLabel =
		reportType === "pages_read_by_month"
			? t("dashboard.report.pagesRead")
			: t("dashboard.report.itemsCompleted");

	function renderChart() {
		if (reportType === "books_completed_by_genre") {
			const genreData = data as GenreDataPoint[];
			const total = genreData.reduce((sum, d) => sum + d.value, 0);
			return (
				<ResponsiveContainer width="100%" height={220}>
					<PieChart>
						<Pie
							data={genreData}
							cx="50%"
							cy="50%"
							innerRadius={65}
							outerRadius={90}
							dataKey="value"
							nameKey="genre"
						>
							<Label
								content={({ viewBox }) => {
									const { cx, cy } = viewBox as { cx: number; cy: number };
									return (
										<text textAnchor="middle">
											<tspan
												x={cx}
												y={cy - 6}
												fontSize={24}
												fontWeight="bold"
												fill="var(--card-foreground)"
											>
												{total}
											</tspan>
											<tspan
												x={cx}
												y={cy + 16}
												fontSize={12}
												fill="var(--muted-foreground)"
											>
												{t("dashboard.report.books")}
											</tspan>
										</text>
									);
								}}
							/>
							{genreData.map((entry, index) => (
								<Cell
									key={entry.genre}
									fill={PIE_COLORS[index % PIE_COLORS.length]}
								/>
							))}
						</Pie>
						<Tooltip
							formatter={(value, name) => [value, name]}
							contentStyle={TOOLTIP_CONTENT_STYLE}
							itemStyle={{ color: "var(--card-foreground)" }}
						/>
					</PieChart>
				</ResponsiveContainer>
			);
		}

		if (reportType === "avg_score_by_genre") {
			const genreData = data as GenreDataPoint[];
			const chartHeight = Math.max(220, genreData.length * 36);
			return (
				<ResponsiveContainer width="100%" height={chartHeight}>
					<BarChart
						data={genreData}
						layout="vertical"
						margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
					>
						<CartesianGrid
							strokeDasharray="3 3"
							stroke="var(--border)"
							horizontal={false}
						/>
						<XAxis
							type="number"
							domain={[0, 5]}
							tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
							axisLine={false}
							tickLine={false}
						/>
						<YAxis
							type="category"
							dataKey="genre"
							tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
							axisLine={false}
							tickLine={false}
							width={90}
						/>
						<Tooltip
							content={({ active, payload, label }) => {
								if (!active || !payload || payload.length === 0) {
									return null;
								}
								return (
									<div style={{ ...TOOLTIP_CONTENT_STYLE, padding: "6px 10px" }}>
										<p style={{ marginBottom: 2 }}>{label}</p>
										<p>
											{t("dashboard.report.avgScore")}:{" "}
											{Number(payload[0]?.value).toFixed(1)}
										</p>
									</div>
								);
							}}
							cursor={{ fill: "var(--border)", opacity: 0.4 }}
						/>
						<Bar dataKey="value" radius={[0, 4, 4, 0]}>
							{genreData.map((entry, index) => (
								<Cell
									key={entry.genre}
									fill={PIE_COLORS[index % PIE_COLORS.length]}
								/>
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			);
		}

		const timeData = data as ReportDataPoint[];
		return (
			<ResponsiveContainer width="100%" height={220}>
				<LineChart
					data={timeData}
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
						formatter={(value) => [value, tooltipValueLabel]}
						labelFormatter={(label) => formatTooltipLabel(String(label))}
						contentStyle={TOOLTIP_CONTENT_STYLE}
						itemStyle={{ color: "var(--card-foreground)" }}
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
		);
	}

	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<div className="flex flex-wrap items-center justify-between gap-2 mb-4">
				<h2 className="text-base font-semibold text-card-foreground">
					{reportLabel[reportType]}
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
							<SelectItem value="books_completed_by_genre">
								{t("dashboard.report.booksCompletedByGenre")}
							</SelectItem>
							<SelectItem value="avg_score_by_genre">
								{t("dashboard.report.avgScoreByGenre")}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
			{renderChart()}
		</div>
	);
}
