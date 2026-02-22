import type { MediaItemDetails } from "@/server/mediaItem";

interface ArtworkProps {
	mediaItemDetails: MediaItemDetails;
}

export function Artwork(props: ArtworkProps) {
	const { mediaItemDetails } = props;
	return (
		<div className="shrink-0 w-full md:w-52">
			<div className="aspect-2/3 bg-gray-800 rounded-lg overflow-hidden">
				{mediaItemDetails.coverImageUrl ? (
					<img
						src={mediaItemDetails.coverImageUrl}
						alt={mediaItemDetails.title}
						className="w-full h-full object-cover"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
						No Cover
					</div>
				)}
			</div>
		</div>
	);
}
