import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import { customReports, userSettings } from "#/db/schema";
import { MediaItemType } from "#/lib/enums";
import { getLoggedInUser } from "#/lib/session";
import { getDrillDownItems } from "./drilldown/drilldown";
import { fetchAverageScoreByGenre } from "./reportTypes/averageScoreByGenre.server";
import { fetchItemsCompletedByGenre } from "./reportTypes/completedByGenre.server";
import { fetchItemsCompletedByMonth } from "./reportTypes/itemsCompletedByMonth.server";
import { fetchProgressByMonth } from "./reportTypes/progressByMonth.server";
import type {
	CustomReport,
	DashboardReport,
	GenreDataPoint,
	ReportDataPoint,
} from "./types";
import { rowToCustomReport } from "./utils.server";

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
	async (): Promise<DashboardReport> => {
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
				data = await fetchAverageScoreByGenre(
					user.id,
					activeReport.monthCount,
					activeReport.mediaTypes,
				);
			}
		}

		return { customReports: allCustomReports, activeReport, data };
	},
);

export { getDrillDownItems };


// ---- Private helpers --------------------------------------------------------

async function ensureUserSettings(userId: string): Promise<void> {
	await db.insert(userSettings).values({ userId }).onConflictDoNothing();
}
