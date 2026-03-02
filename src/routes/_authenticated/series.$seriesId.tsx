import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { DeleteButton } from "#/components/common/DeleteButton";
import { PageHeader } from "#/components/common/PageHeader";
import { SeriesInfo } from "#/components/seriesDetails/SeriesInfo";
import { SeriesItems } from "#/components/seriesDetails/SeriesItems";
import { deleteSeries, getSeriesDetails } from "#/server/series";

export const Route = createFileRoute("/_authenticated/series/$seriesId")({
	loader: ({ params }) =>
		getSeriesDetails({ data: { id: parseInt(params.seriesId, 10) } }),
	component: SeriesPage,
});

function SeriesPage() {
	const seriesDetails = Route.useLoaderData();
	const navigate = useNavigate();
	const { t } = useTranslation();
	const [isDeleting, setIsDeleting] = useState(false);

	async function handleDelete() {
		setIsDeleting(true);
		try {
			await deleteSeries({ data: { seriesId: seriesDetails.id } });
			await navigate({ to: "/" });
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<div className="min-h-screen bg-background text-foreground">
			<PageHeader
				shouldShowBackButton
				right={
					<DeleteButton onClick={handleDelete} disabled={isDeleting}>
						{t("seriesDetails.delete")}
					</DeleteButton>
				}
			/>

			<div className="px-6 py-8 max-w-5xl mx-auto">
				<SeriesInfo seriesDetails={seriesDetails} />
				<SeriesItems items={seriesDetails.items} />
			</div>
		</div>
	);
}
