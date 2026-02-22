import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { mediaItemStatusEnum } from "@/db/schema";
import {
	type MediaItemDetails,
	updateMediaItemStatus,
} from "@/server/mediaItem";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

interface StatusSelectProps {
	mediaItemDetails: MediaItemDetails;
}

export function StatusSelect(props: StatusSelectProps) {
	const { mediaItemDetails } = props;
	const router = useRouter();
	const { t } = useTranslation();

	async function handleStatusChange(status: string) {
		await updateMediaItemStatus({
			data: {
				mediaItemId: mediaItemDetails.id,
				status: status as (typeof mediaItemStatusEnum.enumValues)[number],
			},
		});
		router.invalidate();
	}

	return (
		<Select value={mediaItemDetails.status} onValueChange={handleStatusChange}>
			<SelectTrigger className="w-44">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{mediaItemStatusEnum.enumValues.map((status) => (
					<SelectItem key={status} value={status}>
						{t(`status.${status}`)}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
