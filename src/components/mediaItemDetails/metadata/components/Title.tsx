import type { MediaItemDetails } from "@/server/mediaItem";
import { useTranslation } from "react-i18next";

interface TitleProps {
	mediaItemDetails: MediaItemDetails;
}

export function Title(props: TitleProps) {
	const { mediaItemDetails } = props;
	const { t } = useTranslation();
	return (
		<div className="flex items-start gap-3 flex-wrap">
			<h1 className="text-3xl font-bold leading-tight">
				{mediaItemDetails.title}
			</h1>
			<span className="mt-2 text-s px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 shrink-0">
				{t(`mediaType.${mediaItemDetails.type}`)}
			</span>
		</div>
	);
}
