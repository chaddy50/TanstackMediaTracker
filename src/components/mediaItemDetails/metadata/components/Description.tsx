import type { MediaItemDetails } from "@/server/mediaItem";

interface DescriptionProps {
	mediaItemDetails: MediaItemDetails;
}

export function Description(props: DescriptionProps) {
	const { mediaItemDetails } = props;
	return (
		<>
			{mediaItemDetails.description && (
				<p className="text-muted-foreground text-sm leading-relaxed">
					{mediaItemDetails.description}
				</p>
			)}
		</>
	);
}
