import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import { customReports } from "#/db/schema";
import { getLoggedInUser } from "#/server/auth/session";
import type { DrillDownItemsResult } from "../types";
import { getDateRangeFromMonthCount, rowToCustomReport } from "../utils.server";
import {
	fetchDrillDownItemsForGenre,
	fetchDrillDownItemsForMonth,
} from "./drilldown.server";

export const getDrillDownItems = createServerFn({ method: "GET" })
	.inputValidator(z.object({ reportId: z.number().int(), key: z.string() }))
	.handler(async ({ data }): Promise<DrillDownItemsResult> => {
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
			const { startDate, endDate } = getDateRangeFromMonthCount(
				report.monthCount,
			);
			return fetchDrillDownItemsForGenre(
				user.id,
				data.key,
				startDate,
				endDate,
				report.mediaTypes,
			);
		} else {
			return fetchDrillDownItemsForMonth(user.id, data.key, report.mediaTypes);
		}
	});
