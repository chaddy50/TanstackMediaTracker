import { MediaItemType } from "#/lib/enums";
import type { MediaItemDetails } from "#/server/mediaItems/mediaItem";
import { useRouter } from "@tanstack/react-router";
import type { SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { InstanceEditForm } from "./InstanceEditForm";
import { InstanceRow } from "./InstanceRow";

interface InstanceListProps {
	mediaItemDetails: MediaItemDetails;
	idBeingEdited: number | "new" | null;
	setIdBeingEdited: (value: SetStateAction<number | "new" | null>) => void;
}

export function InstanceList(props: InstanceListProps) {
	const { mediaItemDetails, idBeingEdited, setIdBeingEdited } = props;
	const router = useRouter();
	const { t } = useTranslation();

	function onInstanceSaved() {
		router.invalidate();
		setIdBeingEdited(null);
	}

	if (mediaItemDetails.instances.length === 0 && idBeingEdited !== "new") {
		return (
			<p className="text-muted-foreground text-sm">
				{t("mediaItemDetails.noInstances")}
			</p>
		);
	}

	const isTvShow = mediaItemDetails.type === MediaItemType.TV_SHOW;
	const totalSeasons = isTvShow
		? (mediaItemDetails.metadata as { seasons?: number })?.seasons
		: undefined;

	return (
		<div className="flex flex-col gap-3">
			{idBeingEdited === "new" && (
				<InstanceEditForm
					mediaItemId={mediaItemDetails.id}
					isTvShow={isTvShow}
					totalSeasons={totalSeasons}
					onSave={onInstanceSaved}
					onCancel={() => setIdBeingEdited(null)}
				/>
			)}

			{mediaItemDetails.instances.map((instance, idx) =>
				idBeingEdited === instance.id ? (
					<InstanceEditForm
						key={instance.id}
						instance={instance}
						mediaItemId={mediaItemDetails.id}
						isTvShow={isTvShow}
						totalSeasons={totalSeasons}
						onSave={onInstanceSaved}
						onCancel={() => setIdBeingEdited(null)}
					/>
				) : (
					<InstanceRow
						key={instance.id}
						index={idx + 1}
						instance={instance}
						onEdit={() => setIdBeingEdited(instance.id)}
					/>
				),
			)}
		</div>
	);
}
