import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { PurchaseStatus } from "#/lib/enums";
import { type MediaItemDetails, setPurchaseStatus } from "#/server/mediaItems/mediaItem";

interface PurchasedToggleProps {
	mediaItemDetails: MediaItemDetails;
}

export function PurchasedToggle({ mediaItemDetails }: PurchasedToggleProps) {
	const router = useRouter();
	const { t } = useTranslation();

	async function handleChange(value: string) {
		await setPurchaseStatus({
			data: {
				mediaItemId: mediaItemDetails.id,
				purchaseStatus: value as PurchaseStatus,
			},
		});
		router.invalidate();
	}

	return (
		<Select value={mediaItemDetails.purchaseStatus} onValueChange={handleChange}>
			<SelectTrigger className="w-40">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{Object.values(PurchaseStatus).map((status) => (
					<SelectItem key={status} value={status}>
						{t(`purchaseStatus.${status}`)}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
