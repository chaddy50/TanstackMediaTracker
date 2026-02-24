import type { MediaItemDetails } from "@/server/mediaItem";
import { Artwork } from "./components/Artwork";
import { Description } from "./components/Description";
import { MetadataList } from "./components/MetadataList";
import { StatusSelect } from "./components/StatusSelect";
import { Title } from "./components/Title";

interface MetadataProps {
	mediaItemDetails: MediaItemDetails;
}

export function Metadata(props: MetadataProps) {
	const { mediaItemDetails } = props;

	return (
		<div className="flex flex-col md:flex-row gap-8 mb-10">
			<Artwork mediaItemDetails={mediaItemDetails} />

			<div className="flex flex-col gap-5 flex-1 min-w-0">
				<Title mediaItemDetails={mediaItemDetails} />

				<StatusSelect mediaItemDetails={mediaItemDetails} />

				<Description mediaItemDetails={mediaItemDetails} />

				<MetadataList
					type={mediaItemDetails.type}
					metadata={mediaItemDetails.metadata}
					releaseDate={mediaItemDetails.releaseDate}
					seriesId={mediaItemDetails.seriesId}
				/>
			</div>
		</div>
	);
}
