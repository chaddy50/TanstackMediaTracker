import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ViewScreen } from "#/features/screens/customView/CustomViewScreen";
import {
	getViewResults,
	getViewStats,
} from "#/features/screens/customView/view";

export const Route = createFileRoute("/_authenticated/_app/views/$viewId")({
	validateSearch: z.object({ titleQuery: z.string().optional() }),
	loaderDeps: ({ search }) => search,
	loader: async ({ params, deps }) => {
		const viewId = parseInt(params.viewId, 10);
		const [results, stats] = await Promise.all([
			getViewResults({ data: { viewId, titleQuery: deps.titleQuery } }),
			getViewStats({ data: { viewId, titleQuery: deps.titleQuery } }),
		]);
		return { ...results, stats };
	},
	staleTime: 30_000,
	component: ViewScreen,
});
