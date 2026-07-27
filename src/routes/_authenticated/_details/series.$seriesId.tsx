import { createFileRoute } from "@tanstack/react-router";

import { SeriesDetailsScreen } from "#/features/screens/seriesDetails/SeriesDetailsScreen";
import { getSeriesDetails } from "#/features/screens/seriesDetails/seriesDetails";

export const Route = createFileRoute(
	"/_authenticated/_details/series/$seriesId",
)({
	loader: ({ params }) =>
		getSeriesDetails({ data: { id: parseInt(params.seriesId, 10) } }),
	component: SeriesDetailsScreen,
});
