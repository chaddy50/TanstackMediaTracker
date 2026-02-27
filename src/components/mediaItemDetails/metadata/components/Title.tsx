import type { MediaItemDetails } from "@/server/mediaItem";

import { TypeBadge } from "@/components/common/TypeBadge";

interface TitleProps {
	mediaItemDetails: MediaItemDetails;
}

export function Title(props: TitleProps) {
	const { mediaItemDetails } = props;
	return (
		<div className="flex items-start gap-3 flex-wrap">
			<h1 className="text-3xl font-bold leading-tight">
				{mediaItemDetails.title}
			</h1>
			<span className="mt-2 shrink-0">
				<TypeBadge type={mediaItemDetails.type} />
			</span>
		</div>
	);
}
