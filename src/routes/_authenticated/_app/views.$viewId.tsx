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
	// ViewScreen holds per-view reorder state (the pulled order list, the pending
	// save chain). Without a remount key the router reuses the instance across a
	// viewId change, so the next view inherits the previous view's reorder mode
	// and drops there would save the wrong items against it.
	remountDeps: ({ params }) => params.viewId,
	component: ViewScreen,
});
