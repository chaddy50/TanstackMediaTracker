import { useNavigate } from "@tanstack/react-router";
import { Settings2Icon } from "lucide-react";
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

import { Button } from "#/components/ui/button";
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
	type DashboardReport as DashboardReportData,
	type GenreDataPoint,
	getDashboardReport,
	type ReportDataPoint,
	setActiveCustomReport,
} from "#/server/reports";
import { ManageReportsDialog } from "./ManageReportsDialog";

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
	const navigate = useNavigate();
	const [customReports, setCustomReports] = useState<CustomReport[]>(
		initialReport.customReports,
	);
	const [activeReport, setActiveReport] = useState<CustomReport | null>(
		initialReport.activeReport,
	);
	const [data, setData] = useState<ReportDataPoint[] | GenreDataPoint[]>(
		initialReport.data,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [isManageOpen, setIsManageOpen] = useState(false);

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

	function getProgressLabel(): string {
		const mediaType = activeReport?.mediaTypes?.[0];
		if (mediaType === MediaItemType.BOOK) {
			return t("dashboard.report.progressLabels.pages");
		} else if (mediaType === MediaItemType.TV_SHOW) {
			return t("dashboard.report.progressLabels.episodes");
		} else if (
			mediaType === MediaItemType.MOVIE ||
			mediaType === MediaItemType.PODCAST ||
			mediaType === MediaItemType.VIDEO_GAME
		) {
			return t("dashboard.report.progressLabels.hours");
		}
		return t("dashboard.report.progressLabels.items");
	}

	async function handleReportSelect(reportId: string) {
		const selectedId = parseInt(reportId, 10);
		setIsLoading(true);
		try {
			await setActiveCustomReport({ data: { id: selectedId } });
			const updated = await getDashboardReport();
			setCustomReports(updated.customReports);
			setActiveReport(updated.activeReport);
			setData(updated.data);
		} finally {
			setIsLoading(false);
		}
	}

	function handleReportsChanged(updatedReports: CustomReport[]) {
		setCustomReports(updatedReports);
		if (activeReport && !updatedReports.find((r) => r.id === activeReport.id)) {
			// Active report was deleted — pick the first remaining one
			if (updatedReports.length > 0) {
				handleReportSelect(String(updatedReports[0].id));
			} else {
				setActiveReport(null);
				setData([]);
			}
		} else if (activeReport) {
			const updatedVersion = updatedReports.find((r) => r.id === activeReport.id);
			const wasEdited =
				updatedVersion &&
				JSON.stringify(updatedVersion) !== JSON.stringify(activeReport);
			if (wasEdited) {
				// Config changed — re-select to refresh chart data
				setActiveReport(updatedVersion);
				handleReportSelect(String(activeReport.id));
			}
		} else if (!activeReport && updatedReports.length > 0) {
			// First report just created — select it
			handleReportSelect(String(updatedReports[updatedReports.length - 1].id));
		}
	}

	function navigateToDrillDown(key: string) {
		if (!activeReport) {
			return;
		}
		navigate({
			to: "/reports/$reportId/drilldown",
			params: { reportId: String(activeReport.id) },
			search: { key },
		});
	}

	function renderChart() {
		if (!activeReport) {
			return null;
		}

		if (activeReport.reportType === "items_completed_by_genre") {
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
							style={{ cursor: "pointer" }}
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
												{t("dashboard.report.progressLabels.items")}
											</tspan>
										</text>
									);
								}}
							/>
							{genreData.map((entry, index) => (
								<Cell
									key={entry.genre}
									fill={PIE_COLORS[index % PIE_COLORS.length]}
									onClick={() => navigateToDrillDown(entry.genre)}
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

		if (activeReport.reportType === "avg_score_by_genre") {
			const genreData = data as GenreDataPoint[];
			const chartHeight = Math.max(220, genreData.length * 36);
			return (
				<ResponsiveContainer width="100%" height={chartHeight}>
					<BarChart
						data={genreData}
						layout="vertical"
						margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
						style={{ cursor: "pointer" }}
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
						<Bar
							dataKey="value"
							radius={[0, 4, 4, 0]}
							onClick={(barData: unknown) =>
								navigateToDrillDown((barData as GenreDataPoint).genre)
							}
						>
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

		// progress_by_month and items_completed_by_month
		const timeData = data as ReportDataPoint[];
		const progressLabel =
			activeReport.reportType === "progress_by_month"
				? getProgressLabel()
				: t("dashboard.report.progressLabels.items");

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
						formatter={(value) => [value, progressLabel]}
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
						activeDot={{
							r: 6,
							fill: "#69359c",
							strokeWidth: 0,
							style: { cursor: "pointer" },
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							onClick: (_event: any, payload: any) =>
								navigateToDrillDown(
									(payload as { payload: ReportDataPoint }).payload.month,
								),
						}}
					/>
				</LineChart>
			</ResponsiveContainer>
		);
	}

	if (customReports.length === 0) {
		return (
			<div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center justify-center gap-3 min-h-40">
				<p className="text-sm text-muted-foreground">
					{t("dashboard.report.noReports")}
				</p>
				<Button variant="outline" size="sm" onClick={() => setIsManageOpen(true)}>
					{t("dashboard.report.createFirstReport")}
				</Button>
				<ManageReportsDialog
					isOpen={isManageOpen}
					reports={customReports}
					onClose={() => setIsManageOpen(false)}
					onReportsChanged={handleReportsChanged}
				/>
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<div className="flex flex-wrap items-center justify-between gap-2 mb-4">
				<Select
					value={activeReport ? String(activeReport.id) : undefined}
					onValueChange={handleReportSelect}
					disabled={isLoading}
				>
					<SelectTrigger className="w-auto max-w-xs border-transparent bg-transparent shadow-none px-0 text-base font-semibold text-card-foreground hover:bg-accent hover:text-accent-foreground">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{customReports.map((report) => (
							<SelectItem key={report.id} value={String(report.id)}>
								{report.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => setIsManageOpen(true)}
					title={t("dashboard.report.manageReports")}
				>
					<Settings2Icon />
				</Button>
			</div>
			{renderChart()}
			<ManageReportsDialog
				isOpen={isManageOpen}
				reports={customReports}
				onClose={() => setIsManageOpen(false)}
				onReportsChanged={handleReportsChanged}
			/>
		</div>
	);
}
