import { ExpandableDescription } from "@/components/common/ExpandableDescription";
import type { MediaItemDetails } from "@/server/mediaItem";

interface DescriptionProps {
	mediaItemDetails: MediaItemDetails;
}

export function Description(props: DescriptionProps) {
	const { mediaItemDetails } = props;
	if (!mediaItemDetails.description) {
		return null;
	}
	return <ExpandableDescription text={mediaItemDetails.description} />;
}
