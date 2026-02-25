import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { DeleteButton } from "@/components/common/DeleteButton";
import { PageHeader } from "@/components/common/PageHeader";
import { History } from "@/components/mediaItemDetails/history/History";
import { Metadata } from "@/components/mediaItemDetails/metadata/Metadata";
import { getMediaItemDetails, removeFromLibrary } from "@/server/mediaItem";

export const Route = createFileRoute("/mediaItemDetails/$mediaItemId")({
	loader: ({ params }) =>
		getMediaItemDetails({ data: { id: parseInt(params.mediaItemId, 10) } }),
	component: EntryDetailPage,
});

function EntryDetailPage() {
	const mediaItemDetails = Route.useLoaderData();
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [deleting, setDeleting] = useState(false);

	async function handleDelete() {
		setDeleting(true);
		try {
			await removeFromLibrary({
				data: { metadataId: mediaItemDetails.metadataId },
			});
			await navigate({ to: "/" });
		} finally {
			setDeleting(false);
		}
	}

	return (
		<div className="min-h-screen bg-background text-foreground">
			<PageHeader
				backButtonDestination="/"
				right={
					<DeleteButton onClick={handleDelete} disabled={deleting}>
						{t("mediaItemDetails.removeFromLibrary")}
					</DeleteButton>
				}
			/>

			<div className="px-6 py-8 max-w-5xl mx-auto">
				<Metadata mediaItemDetails={mediaItemDetails} />
				<History mediaItemDetails={mediaItemDetails} />
			</div>
		</div>
	);
}
