import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ReportDrilldownScreen } from "#/features/screens/reports/ReportDrilldownScreen";
import { getDrillDownItems } from "#/features/screens/reports/reports";

const searchSchema = z.object({
	key: z.string(),
});

export const Route = createFileRoute(
	"/_authenticated/_details/reports/$reportId/drilldown",
)({
	validateSearch: searchSchema,
	loaderDeps: ({ search }: { search: { key: string } }) => ({
		key: search.key,
	}),
	loader: ({ params, deps }) =>
		getDrillDownItems({
			data: { reportId: parseInt(params.reportId, 10), key: deps.key },
		}),
	component: ReportDrilldownScreen,
});
