import { ExpandableTextBlock } from "@/components/common/ExpandableTextBlock";
import type { MediaItemDetails } from "@/server/mediaItem";

interface DescriptionProps {
	mediaItemDetails: MediaItemDetails;
}

export function Description(props: DescriptionProps) {
	const { mediaItemDetails } = props;
	if (!mediaItemDetails.description) {
		return null;
	}
	return <ExpandableTextBlock text={mediaItemDetails.description} />;
}
