import { BackButton } from "@/components/common/BackButton";
import { History } from "@/components/mediaItemDetails/history/History";
import { Metadata } from "@/components/mediaItemDetails/metadata/Metadata";
import { getMediaItemDetails } from "@/server/mediaItem";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
export const Route = createFileRoute("/mediaItemDetails/$mediaItemId")({
	loader: ({ params }) =>
		getMediaItemDetails({ data: { id: parseInt(params.mediaItemId, 10) } }),
	component: EntryDetailPage,
});

function EntryDetailPage() {
	const mediaItemDetails = Route.useLoaderData();
	const { t } = useTranslation();

	return (
		<div className="min-h-screen bg-background text-foreground">
			<BackButton
				destination="/"
				caption={t("mediaItemDetails.backToLibrary")}
			/>

			<div className="px-6 py-8 max-w-5xl mx-auto">
				<Metadata mediaItemDetails={mediaItemDetails} />
				<History mediaItemDetails={mediaItemDetails} />
			</div>
		</div>
	);
}
