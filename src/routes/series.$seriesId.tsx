import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "#/components/common/PageHeader";
import { SeriesInfo } from "#/components/seriesDetails/SeriesInfo";
import { SeriesItems } from "#/components/seriesDetails/SeriesItems";
import { getSeriesDetails } from "#/server/series";

export const Route = createFileRoute("/series/$seriesId")({
	loader: ({ params }) =>
		getSeriesDetails({ data: { id: parseInt(params.seriesId, 10) } }),
	component: SeriesPage,
});

function SeriesPage() {
	const seriesDetails = Route.useLoaderData();
	return (
		<div className="min-h-screen bg-background text-foreground">
			<PageHeader backButtonDestination="/" />

			<div className="px-6 py-8 max-w-5xl mx-auto">
				<SeriesInfo seriesDetails={seriesDetails} />
				<SeriesItems items={seriesDetails.items} />
			</div>
		</div>
	);
}
