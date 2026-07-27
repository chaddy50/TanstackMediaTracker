import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { DeleteButton } from "#/components/DeleteButton";
import { TopBar } from "#/features/navigation/topBar/TopBar";
import { SeriesInfo } from "./components/SeriesInfo";
import { SeriesItems } from "./components/SeriesItems";
import { deleteSeries } from "./seriesDetails";

const route = getRouteApi("/_authenticated/_details/series/$seriesId");

export function SeriesDetailsScreen() {
	const seriesDetails = route.useLoaderData();
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
			<TopBar
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
