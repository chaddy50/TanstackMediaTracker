import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import {
	customReports,
	genres,
	mediaItemInstances,
	mediaItemMetadata,
	mediaItems,
	userSettings,
} from "#/db/schema";
import {
	type MediaItemStatus,
	MediaItemType,
	type PurchaseStatus,
} from "#/lib/enums";
import { getLoggedInUser } from "#/lib/session";
import { buildLastNMonths, cutoffDateFromMonthCount, fetchItemsCompletedByGenre, fetchProgressByMonth } from "./reports.server";

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

// ---- Helpers ----------------------------------------------------------------

function rowToCustomReport(
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

async function ensureUserSettings(userId: string): Promise<void> {
	await db.insert(userSettings).values({ userId }).onConflictDoNothing();
}

// ---- Aggregation queries ----------------------------------------------------

async function fetchItemsCompletedByMonth(
	userId: string,
	monthCount: number,
	mediaTypes?: MediaItemType[] | null,
): Promise<ReportDataPoint[]> {
	const cutoffDate = cutoffDateFromMonthCount(monthCount);

	const hasTypeFilter = mediaTypes && mediaTypes.length > 0;

	const rows = await db
		.select({
			month: sql<string>`to_char(${mediaItemInstances.completedAt}, 'YYYY-MM')`,
			value: sql<number>`COUNT(DISTINCT ${mediaItems.id})`,
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
				isNotNull(mediaItemInstances.completedAt),
				sql`${mediaItemInstances.completedAt} >= ${cutoffDate}`,
				hasTypeFilter ? inArray(mediaItemMetadata.type, mediaTypes) : undefined,
			),
		)
		.groupBy(sql`to_char(${mediaItemInstances.completedAt}, 'YYYY-MM')`)
		.orderBy(sql`to_char(${mediaItemInstances.completedAt}, 'YYYY-MM')`);

	return buildLastNMonths(rows, monthCount);
}

async function fetchAvgScoreByGenre(
	userId: string,
	monthCount: number,
	mediaTypes?: MediaItemType[] | null,
): Promise<GenreDataPoint[]> {
	const cutoffDate = cutoffDateFromMonthCount(monthCount);

	const hasTypeFilter = mediaTypes && mediaTypes.length > 0;

	const rows = await db
		.select({
			genre: genres.name,
			value: sql<number>`ROUND(AVG(${mediaItemInstances.rating}::float)::numeric, 1)`,
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
				isNotNull(mediaItemInstances.rating),
				isNotNull(mediaItemInstances.completedAt),
				sql`${mediaItemInstances.completedAt} >= ${cutoffDate}`,
				hasTypeFilter ? inArray(mediaItemMetadata.type, mediaTypes) : undefined,
			),
		)
		.groupBy(genres.name)
		.orderBy(sql`AVG(${mediaItemInstances.rating}::float) DESC`);

	return rows.map((row) => ({ genre: row.genre, value: Number(row.value) }));
}

// ---- Drill-down query -------------------------------------------------------

async function fetchDrillDownItemsForMonth(
	userId: string,
	month: string, // "YYYY-MM"
	mediaTypes?: MediaItemType[] | null,
): Promise<DrillDownItem[]> {
	const filteredTypes = mediaTypes && mediaTypes.length > 0 ? mediaTypes : [];
	const hasTypeFilter = filteredTypes.length > 0;

	const rows = await db.execute<{
		id: number;
		status: string;
		purchase_status: string;
		title: string;
		type: string;
		cover_image_url: string | null;
		rating: string | null;
		completed_at: string | null;
		expected_release_date: string | null;
		series_id: number | null;
		series_name: string | null;
	}>(sql`
		SELECT * FROM (
			SELECT DISTINCT ON (mi.id)
				mi.id,
				mi.status,
				mi.purchase_status,
				mim.title,
				mim.type,
				mim.cover_image_url,
				inst.rating,
				inst.completed_at,
				mi.expected_release_date,
				mi.series_id,
				s.name AS series_name
			FROM media_item_instances inst
			JOIN media_items mi ON inst.media_item_id = mi.id
			JOIN media_metadata mim ON mi.media_item_metadata_id = mim.id
			LEFT JOIN series s ON mi.series_id = s.id
			WHERE
				mi.user_id = ${userId}
				AND inst.completed_at IS NOT NULL
				AND to_char(inst.completed_at, 'YYYY-MM') = ${month}
				${
					hasTypeFilter
						? sql`AND mim.type::text = ANY(ARRAY[${sql.join(
								filteredTypes.map((t) => sql`${t}`),
								sql`, `,
							)}]::text[])`
						: sql``
				}
			ORDER BY mi.id, inst.completed_at DESC
		) sub
		ORDER BY sub.completed_at DESC
	`);

	return rows.rows.map((row) => ({
		id: row.id,
		status: row.status as MediaItemStatus,
		purchaseStatus: row.purchase_status as PurchaseStatus,
		title: row.title,
		type: row.type as MediaItemType,
		coverImageUrl: row.cover_image_url,
		rating: row.rating ? Number(row.rating) : 0,
		completedAt: row.completed_at,
		expectedReleaseDate: row.expected_release_date,
		seriesId: row.series_id,
		seriesName: row.series_name,
	}));
}

async function fetchDrillDownItemsForGenre(
	userId: string,
	genre: string,
	monthCount: number,
	mediaTypes?: MediaItemType[] | null,
): Promise<DrillDownItem[]> {
	const cutoffDate = cutoffDateFromMonthCount(monthCount);
	const filteredTypes = mediaTypes && mediaTypes.length > 0 ? mediaTypes : [];
	const hasTypeFilter = filteredTypes.length > 0;

	const rows = await db.execute<{
		id: number;
		status: string;
		purchase_status: string;
		title: string;
		type: string;
		cover_image_url: string | null;
		rating: string | null;
		completed_at: string | null;
		expected_release_date: string | null;
		series_id: number | null;
		series_name: string | null;
	}>(sql`
		SELECT * FROM (
			SELECT DISTINCT ON (mi.id)
				mi.id,
				mi.status,
				mi.purchase_status,
				mim.title,
				mim.type,
				mim.cover_image_url,
				inst.rating,
				inst.completed_at,
				mi.expected_release_date,
				mi.series_id,
				s.name AS series_name
			FROM media_item_instances inst
			JOIN media_items mi ON inst.media_item_id = mi.id
			JOIN media_metadata mim ON mi.media_item_metadata_id = mim.id
			JOIN genres g ON mi.genre_id = g.id
			LEFT JOIN series s ON mi.series_id = s.id
			WHERE
				mi.user_id = ${userId}
				AND inst.completed_at IS NOT NULL
				AND inst.completed_at >= ${cutoffDate}
				AND g.name = ${genre}
				${
					hasTypeFilter
						? sql`AND mim.type::text = ANY(ARRAY[${sql.join(
								filteredTypes.map((t) => sql`${t}`),
								sql`, `,
							)}]::text[])`
						: sql``
				}
			ORDER BY mi.id, inst.completed_at DESC
		) sub
		ORDER BY sub.completed_at DESC
	`);

	return rows.rows.map((row) => ({
		id: row.id,
		status: row.status as MediaItemStatus,
		purchaseStatus: row.purchase_status as PurchaseStatus,
		title: row.title,
		type: row.type as MediaItemType,
		coverImageUrl: row.cover_image_url,
		rating: row.rating ? Number(row.rating) : 0,
		completedAt: row.completed_at,
		expectedReleaseDate: row.expected_release_date,
		seriesId: row.series_id,
		seriesName: row.series_name,
	}));
}

// ---- Exported server functions ----------------------------------------------

export const getCustomReports = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await getLoggedInUser();
		const rows = await db
			.select()
			.from(customReports)
			.where(eq(customReports.userId, user.id))
			.orderBy(customReports.displayOrder, customReports.id);
		return rows.map(rowToCustomReport);
	},
);

const customReportInputSchema = z.object({
	name: z.string().min(1),
	reportType: z.enum([
		"progress_by_month",
		"items_completed_by_month",
		"items_completed_by_genre",
		"avg_score_by_genre",
	]),
	mediaTypes: z.array(z.string()).nullable(),
	monthCount: z.number().int().positive(),
});

export const createCustomReport = createServerFn({ method: "POST" })
	.inputValidator(customReportInputSchema)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		const [row] = await db
			.insert(customReports)
			.values({
				userId: user.id,
				name: data.name,
				reportType: data.reportType,
				mediaTypes: data.mediaTypes,
				monthCount: data.monthCount,
			})
			.returning();
		return rowToCustomReport(row);
	});

export const updateCustomReport = createServerFn({ method: "POST" })
	.inputValidator(customReportInputSchema.extend({ id: z.number().int() }))
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		const [row] = await db
			.update(customReports)
			.set({
				name: data.name,
				reportType: data.reportType,
				mediaTypes: data.mediaTypes,
				monthCount: data.monthCount,
			})
			.where(
				and(eq(customReports.id, data.id), eq(customReports.userId, user.id)),
			)
			.returning();
		if (!row) {
			throw new Error("Report not found");
		}
		return rowToCustomReport(row);
	});

export const deleteCustomReport = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.number().int() }))
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		await db
			.delete(customReports)
			.where(
				and(eq(customReports.id, data.id), eq(customReports.userId, user.id)),
			);
	});

export const setActiveCustomReport = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.number().int().nullable() }))
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		await ensureUserSettings(user.id);
		await db
			.update(userSettings)
			.set({ activeCustomReportId: data.id })
			.where(eq(userSettings.userId, user.id));
	});

export const getDashboardReport = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await getLoggedInUser();
		await ensureUserSettings(user.id);

		const [settings] = await db
			.select({ activeCustomReportId: userSettings.activeCustomReportId })
			.from(userSettings)
			.where(eq(userSettings.userId, user.id))
			.limit(1);

		const allReports = await db
			.select()
			.from(customReports)
			.where(eq(customReports.userId, user.id))
			.orderBy(customReports.displayOrder, customReports.id);

		const allCustomReports = allReports.map(rowToCustomReport);

		let activeReport: CustomReport | null = null;
		if (settings?.activeCustomReportId) {
			activeReport =
				allCustomReports.find((r) => r.id === settings.activeCustomReportId) ??
				null;
		}
		if (!activeReport && allCustomReports.length > 0) {
			activeReport = allCustomReports[0];
		}

		let data: ReportDataPoint[] | GenreDataPoint[] = [];
		if (activeReport) {
			if (activeReport.reportType === "progress_by_month") {
				const mediaType = activeReport.mediaTypes?.[0] ?? MediaItemType.BOOK;
				data = await fetchProgressByMonth(
					user.id,
					mediaType,
					activeReport.monthCount,
				);
			} else if (activeReport.reportType === "items_completed_by_month") {
				data = await fetchItemsCompletedByMonth(
					user.id,
					activeReport.monthCount,
					activeReport.mediaTypes,
				);
			} else if (activeReport.reportType === "items_completed_by_genre") {
				data = await fetchItemsCompletedByGenre(
					user.id,
					activeReport.monthCount,
					activeReport.mediaTypes,
				);
			} else {
				data = await fetchAvgScoreByGenre(
					user.id,
					activeReport.monthCount,
					activeReport.mediaTypes,
				);
			}
		}

		return { customReports: allCustomReports, activeReport, data };
	},
);

export const getDrillDownItems = createServerFn({ method: "GET" })
	.inputValidator(z.object({ reportId: z.number().int(), key: z.string() }))
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();

		const [reportRow] = await db
			.select()
			.from(customReports)
			.where(
				and(
					eq(customReports.id, data.reportId),
					eq(customReports.userId, user.id),
				),
			)
			.limit(1);

		if (!reportRow) {
			throw new Error("Report not found");
		}

		const report = rowToCustomReport(reportRow);
		const isGenreReport =
			report.reportType === "items_completed_by_genre" ||
			report.reportType === "avg_score_by_genre";

		if (isGenreReport) {
			return fetchDrillDownItemsForGenre(
				user.id,
				data.key,
				report.monthCount,
				report.mediaTypes,
			);
		} else {
			return fetchDrillDownItemsForMonth(user.id, data.key, report.mediaTypes);
		}
	});

export type DashboardReport = Awaited<ReturnType<typeof getDashboardReport>>;
export type DrillDownItemsResult = Awaited<
	ReturnType<typeof getDrillDownItems>
>;
