import { PurchasedBadge } from "@/components/common/PurchasedBadge";
import { type MediaItemDetails, togglePurchased } from "@/server/mediaItem";
import { useRouter } from "@tanstack/react-router";

interface PurchasedToggleProps {
	mediaItemDetails: MediaItemDetails;
}

export function PurchasedToggle(props: PurchasedToggleProps) {
	const { mediaItemDetails } = props;
	const router = useRouter();

	async function handleToggle() {
		await togglePurchased({
			data: {
				mediaItemId: mediaItemDetails.id,
				isPurchased: !mediaItemDetails.isPurchased,
			},
		});
		router.invalidate();
	}

	return (
		<PurchasedBadge isPurchased={mediaItemDetails.isPurchased} onClick={handleToggle} />
	);
}
