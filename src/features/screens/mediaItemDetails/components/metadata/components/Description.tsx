import { ExpandableTextBlock } from "#/components/ExpandableTextBlock";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";

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
