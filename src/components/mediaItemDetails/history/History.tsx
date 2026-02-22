import type { MediaItemDetails } from "@/server/mediaItem";
import { useState } from "react";
import { InstanceList } from "./components/instance/InstanceList";
import { TopBar } from "./components/TopBar";

interface HistoryProps {
	mediaItemDetails: MediaItemDetails;
}

export function History(props: HistoryProps) {
	const { mediaItemDetails } = props;
	const [idBeingEdited, setIdBeingEdited] = useState<number | "new" | null>(
		null,
	);

	return (
		<div>
			<TopBar
				idBeingEdited={idBeingEdited}
				setIdBeingEdited={setIdBeingEdited}
			/>

			<InstanceList
				mediaItemDetails={mediaItemDetails}
				idBeingEdited={idBeingEdited}
				setIdBeingEdited={setIdBeingEdited}
			/>
		</div>
	);
}
