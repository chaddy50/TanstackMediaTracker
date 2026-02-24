import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

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
	const { t } = useTranslation();

	return (
		<div className="min-h-screen bg-background text-foreground">
			<PageHeader
				left={
					<Link
						to="/"
						className="text-muted-foreground hover:text-foreground text-sm transition-colors"
					>
						← {t("mediaItemDetails.backToLibrary")}
					</Link>
				}
			/>

			<div className="px-6 py-8 max-w-5xl mx-auto">
				<SeriesInfo seriesDetails={seriesDetails} />
				<SeriesItems items={seriesDetails.items} />
			</div>
		</div>
	);
}
