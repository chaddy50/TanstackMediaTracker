import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ViewScreen } from "#/features/screens/customView/CustomViewScreen";
import { getViewResults } from "#/features/screens/customView/view";

export const Route = createFileRoute("/_authenticated/_app/views/$viewId")({
	validateSearch: z.object({ titleQuery: z.string().optional() }),
	loaderDeps: ({ search }) => search,
	loader: ({ params, deps }) =>
		getViewResults({
			data: {
				viewId: parseInt(params.viewId, 10),
				titleQuery: deps.titleQuery,
			},
		}),
	staleTime: 30_000,
	component: ViewScreen,
});
