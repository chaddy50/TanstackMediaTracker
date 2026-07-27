import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { DeleteButton } from "#/components/DeleteButton";
import { TopBar } from "#/features/navigation/topBar/TopBar";
import { CreatorInfo } from "./components/CreatorInfo";
import { CreatorItems } from "./components/CreatorItems";
import { deleteCreator } from "./creatorDetails";

const route = getRouteApi("/_authenticated/_details/creator/$creatorId");

export function CreatorDetailsScreen() {
	const creatorDetails = route.useLoaderData();
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
			<TopBar
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
	);
}
