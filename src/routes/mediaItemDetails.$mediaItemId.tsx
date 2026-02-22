import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/common/PageHeader";
import { History } from "@/components/mediaItemDetails/history/History";
import { Metadata } from "@/components/mediaItemDetails/metadata/Metadata";
import { Button } from "@/components/ui/button";
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
				left={
					<Link
						to="/"
						className="text-muted-foreground hover:text-foreground text-sm transition-colors"
					>
						← {t("mediaItemDetails.backToLibrary")}
					</Link>
				}
				right={
					<Button
						variant="destructive"
						size="sm"
						onClick={handleDelete}
						disabled={deleting}
					>
						{t("mediaItemDetails.removeFromLibrary")}
					</Button>
				}
			/>

			<div className="px-6 py-8 max-w-5xl mx-auto">
				<Metadata mediaItemDetails={mediaItemDetails} />
				<History mediaItemDetails={mediaItemDetails} />
			</div>
		</div>
	);
}
