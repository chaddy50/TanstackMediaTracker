import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { DeleteButton } from "#/components/common/DeleteButton";
import { PageHeader } from "#/components/common/PageHeader";
import { CreatorInfo } from "#/components/creatorDetails/CreatorInfo";
import { CreatorItems } from "#/components/creatorDetails/CreatorItems";
import { deleteCreator, getCreatorDetails } from "#/server/creators/creators";

export const Route = createFileRoute("/_authenticated/_details/creator/$creatorId")({
	loader: ({ params }) =>
		getCreatorDetails({ data: { id: parseInt(params.creatorId, 10) } }),
	component: CreatorPage,
});

function CreatorPage() {
	const creatorDetails = Route.useLoaderData();
	const navigate = useNavigate();
	const { t } = useTranslation();
	const [isDeleting, setIsDeleting] = useState(false);

	async function handleDelete() {
		setIsDeleting(true);
		try {
			await deleteCreator({ data: { creatorId: creatorDetails.id } });
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
						{t("creatorDetails.delete")}
					</DeleteButton>
				}
			/>

			<div className="px-6 py-8 max-w-5xl mx-auto">
				<CreatorInfo creatorDetails={creatorDetails} />
				<CreatorItems items={creatorDetails.items} />
			</div>
		</div>
	)
}
