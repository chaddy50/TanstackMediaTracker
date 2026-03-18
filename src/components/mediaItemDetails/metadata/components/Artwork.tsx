import { MediaItemType } from "#/server/enums";
import type { MediaItemDetails } from "#/server/mediaItems/mediaItem";

interface ArtworkProps {
	mediaItemDetails: MediaItemDetails;
}

export function Artwork(props: ArtworkProps) {
	const { mediaItemDetails } = props;
	return (
		<div className="shrink-0 w-full max-w-64 md:max-w-none md:w-75">
			<div className={`${mediaItemDetails.type === MediaItemType.PODCAST ? "aspect-square" : "aspect-2/3"} bg-muted rounded-lg overflow-hidden`}>
				{mediaItemDetails.coverImageUrl ? (
					<img
						src={mediaItemDetails.coverImageUrl}
						alt={mediaItemDetails.title}
						className="w-full h-full object-fill"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
						No Cover
					</div>
				)}
			</div>
		</div>
	);
}
