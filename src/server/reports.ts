import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import {
	genres,
	mediaItemInstances,
	mediaItemMetadata,
	mediaItems,
	userSettings,
} from "#/db/schema";
import { MediaItemType } from "#/lib/enums";
import { getLoggedInUser } from "#/lib/session";

export type DashboardReportType =
	| "pages_read_by_month"
	| "items_completed_by_month"
	| "books_completed_by_genre"
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

/**
 * Returns the last `monthCount` months as "YYYY-MM" strings in ascending order.
 */
function buildMonthRange(monthCount: number): string[] {
	const months: string[] = [];
	const now = new Date();
	for (let offset = monthCount - 1; offset >= 0; offset--) {
		const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		months.push(`${year}-${month}`);
	}
	return months;
}

type UserSettingsRow = {
	reportType: DashboardReportType;
	reportMonths: ReportMonthOption;
};

async function ensureUserSettings(userId: string): Promise<UserSettingsRow> {
	await db
		.insert(userSettings)
		.values({ userId, dashboardReport: "pages_read_by_month", dashboardReportMonths: 12 })
		.onConflictDoNothing();

	const row = await db
		.select({
			dashboardReport: userSettings.dashboardReport,
			dashboardReportMonths: userSettings.dashboardReportMonths,
		})
		.from(userSettings)
		.where(eq(userSettings.userId, userId))
		.limit(1);

	const reportType = (row[0]?.dashboardReport ?? "pages_read_by_month") as DashboardReportType;
	const rawMonths = row[0]?.dashboardReportMonths ?? 12;
	const reportMonths = (REPORT_MONTH_OPTIONS.includes(rawMonths as ReportMonthOption)
		? rawMonths
		: 12) as ReportMonthOption;

	return { reportType, reportMonths };
}

async function fetchPagesReadByMonth(
	userId: string,
	monthCount: number,
): Promise<ReportDataPoint[]> {
	const startDate = new Date();
	startDate.setMonth(startDate.getMonth() - (monthCount - 1));
	startDate.setDate(1);
	const cutoffDate = startDate.toISOString().slice(0, 10);

	const rows = await db
		.select({
			month: sql<string>`to_char(${mediaItemInstances.completedAt}, 'YYYY-MM')`,
			value: sql<number>`COALESCE(SUM((${mediaItemMetadata.metadata}->>'pageCount')::int), 0)`,
		})
		.from(mediaItemInstances)
		.innerJoin(mediaItems, eq(mediaItemInstances.mediaItemId, mediaItems.id))
		.innerJoin(
			mediaItemMetadata,
			eq(mediaItems.mediaItemMetadataId, mediaItemMetadata.id),
		)
		.where(
			and(
				eq(mediaItems.userId, userId),
				eq(mediaItemMetadata.type, MediaItemType.BOOK),
				isNotNull(mediaItemInstances.completedAt),
				sql`${mediaItemInstances.completedAt} >= ${cutoffDate}`,
			),
		)
		.groupBy(sql`to_char(${mediaItemInstances.completedAt}, 'YYYY-MM')`)
		.orderBy(sql`to_char(${mediaItemInstances.completedAt}, 'YYYY-MM')`);

	return mergeWithRange(rows, monthCount);
}

async function fetchItemsCompletedByMonth(
	userId: string,
	monthCount: number,
): Promise<ReportDataPoint[]> {
	const startDate = new Date();
	startDate.setMonth(startDate.getMonth() - (monthCount - 1));
	startDate.setDate(1);
	const cutoffDate = startDate.toISOString().slice(0, 10);

	const rows = await db
		.select({
			month: sql<string>`to_char(${mediaItemInstances.completedAt}, 'YYYY-MM')`,
			value: sql<number>`COUNT(*)`,
		})
		.from(mediaItemInstances)
		.innerJoin(mediaItems, eq(mediaItemInstances.mediaItemId, mediaItems.id))
		.where(
			and(
				eq(mediaItems.userId, userId),
				isNotNull(mediaItemInstances.completedAt),
				sql`${mediaItemInstances.completedAt} >= ${cutoffDate}`,
			),
		)
		.groupBy(sql`to_char(${mediaItemInstances.completedAt}, 'YYYY-MM')`)
		.orderBy(sql`to_char(${mediaItemInstances.completedAt}, 'YYYY-MM')`);

	return mergeWithRange(rows, monthCount);
}

async function fetchBooksCompletedByGenre(
	userId: string,
	monthCount: number,
): Promise<GenreDataPoint[]> {
	const startDate = new Date();
	startDate.setMonth(startDate.getMonth() - (monthCount - 1));
	startDate.setDate(1);
	const cutoffDate = startDate.toISOString().slice(0, 10);

	const rows = await db
		.select({
			genre: genres.name,
			value: sql<number>`COUNT(*)`,
		})
		.from(mediaItemInstances)
		.innerJoin(mediaItems, eq(mediaItemInstances.mediaItemId, mediaItems.id))
		.innerJoin(
			mediaItemMetadata,
			eq(mediaItems.mediaItemMetadataId, mediaItemMetadata.id),
		)
		.innerJoin(genres, eq(mediaItems.genreId, genres.id))
		.where(
			and(
				eq(mediaItems.userId, userId),
				eq(mediaItemMetadata.type, MediaItemType.BOOK),
				isNotNull(mediaItemInstances.completedAt),
				sql`${mediaItemInstances.completedAt} >= ${cutoffDate}`,
			),
		)
		.groupBy(genres.name)
		.orderBy(sql`COUNT(*) DESC`);

	return rows.map((row) => ({ genre: row.genre, value: Number(row.value) }));
}

async function fetchAvgScoreByGenre(
	userId: string,
	monthCount: number,
): Promise<GenreDataPoint[]> {
	const startDate = new Date();
	startDate.setMonth(startDate.getMonth() - (monthCount - 1));
	startDate.setDate(1);
	const cutoffDate = startDate.toISOString().slice(0, 10);

	const rows = await db
		.select({
			genre: genres.name,
			value: sql<number>`ROUND(AVG(${mediaItemInstances.rating}::float)::numeric, 1)`,
		})
		.from(mediaItemInstances)
		.innerJoin(mediaItems, eq(mediaItemInstances.mediaItemId, mediaItems.id))
		.innerJoin(genres, eq(mediaItems.genreId, genres.id))
		.where(
			and(
				eq(mediaItems.userId, userId),
				isNotNull(mediaItemInstances.rating),
				isNotNull(mediaItemInstances.completedAt),
				sql`${mediaItemInstances.completedAt} >= ${cutoffDate}`,
			),
		)
		.groupBy(genres.name)
		.orderBy(sql`AVG(${mediaItemInstances.rating}::float) DESC`);

	return rows.map((row) => ({ genre: row.genre, value: Number(row.value) }));
}

/**
 * Fills in any missing months with a value of 0 so the chart always
 * shows the full selected range.
 */
function mergeWithRange(
	rows: { month: string; value: number }[],
	monthCount: number,
): ReportDataPoint[] {
	const valueByMonth = new Map(rows.map((r) => [r.month, Number(r.value)]));
	return buildMonthRange(monthCount).map((month) => ({
		month,
		value: valueByMonth.get(month) ?? 0,
	}));
}

export const getDashboardReport = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await getLoggedInUser();
		const userId = user.id;

		const { reportType, reportMonths } = await ensureUserSettings(userId);

		let data: ReportDataPoint[] | GenreDataPoint[];
		if (reportType === "pages_read_by_month") {
			data = await fetchPagesReadByMonth(userId, reportMonths);
		} else if (reportType === "items_completed_by_month") {
			data = await fetchItemsCompletedByMonth(userId, reportMonths);
		} else if (reportType === "books_completed_by_genre") {
			data = await fetchBooksCompletedByGenre(userId, reportMonths);
		} else {
			data = await fetchAvgScoreByGenre(userId, reportMonths);
		}

		return { reportType, reportMonths, data };
	},
);

const setDashboardReportSchema = z.object({
	reportType: z.enum(["pages_read_by_month", "items_completed_by_month", "books_completed_by_genre", "avg_score_by_genre"]).optional(),
	reportMonths: z.number().int().positive().optional(),
});

export const setDashboardReport = createServerFn({ method: "POST" })
	.inputValidator(setDashboardReportSchema)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();

		const { reportType, reportMonths } = await ensureUserSettings(user.id);

		await db
			.insert(userSettings)
			.values({
				userId: user.id,
				dashboardReport: data.reportType ?? reportType,
				dashboardReportMonths: data.reportMonths ?? reportMonths,
			})
			.onConflictDoUpdate({
				target: userSettings.userId,
				set: {
					...(data.reportType !== undefined && { dashboardReport: data.reportType }),
					...(data.reportMonths !== undefined && { dashboardReportMonths: data.reportMonths }),
				},
			});
	});

export type DashboardReport = Awaited<ReturnType<typeof getDashboardReport>>;
