import { useTranslation } from "react-i18next";

import { ExpandableTextBlock } from "#/components/common/ExpandableTextBlock";
import type { CreatorDetails } from "#/server/creators/creators";
import { EditCreatorDialog } from "./EditCreatorDialog";

interface CreatorInfoProps {
	creatorDetails: CreatorDetails;
}

export function CreatorInfo({ creatorDetails }: CreatorInfoProps) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col gap-5 mb-10">
			<div className="flex items-start justify-between gap-2">
				<h1 className="text-3xl font-bold leading-tight">
					{creatorDetails.name}
				</h1>
				<EditCreatorDialog creatorDetails={creatorDetails} />
			</div>

			{creatorDetails.biography && (
				<div>
					<h2 className="text-sm font-medium text-muted-foreground mb-1">
						{t("creatorDetails.biography")}
					</h2>
					<ExpandableTextBlock text={creatorDetails.biography} />
				</div>
			)}
		</div>
	);
}
