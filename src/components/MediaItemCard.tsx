import { Link } from "@tanstack/react-router";
import { RatingStars } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/ratingStars/RatingStars";
import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";
import { PurchasedBadge } from "./PurchasedBadge";
import { TypeBadge } from "./TypeBadge";

type MediaItemCardItem = {
	id: number;
	status: MediaItemStatus;
	purchaseStatus: PurchaseStatus;
	title: string;
	type: MediaItemType;
	coverImageUrl: string | null;
	rating: number;
	seriesId?: number | null | undefined;
	seriesName?: string | null | undefined;
};

interface MediaItemCardProps {
	mediaItem: MediaItemCardItem;
	shouldShowType?: boolean;
	shouldShowRating?: boolean;
	shouldShowPurchaseStatus?: boolean;
}

export function MediaItemCard({
	mediaItem,
	shouldShowType = true,
	shouldShowRating = true,
	shouldShowPurchaseStatus = false,
}: MediaItemCardProps) {
	const shouldShowRatingStars =
		shouldShowRating && mediaItem.status === MediaItemStatus.COMPLETED;
	const shouldShowPurchasedBadge =
		shouldShowPurchaseStatus &&
		mediaItem.purchaseStatus === PurchaseStatus.PURCHASED;
	const isPodcast = mediaItem.type === MediaItemType.PODCAST;

	return (
		<Link
			to="/mediaItemDetails/$mediaItemId"
			params={{ mediaItemId: String(mediaItem.id) }}
			className="group flex flex-col bg-card rounded-lg overflow-hidden border border-border hover:border-foreground/30 transition-colors self-start"
		>
			<div className="aspect-2/3 bg-muted relative">
				{mediaItem.coverImageUrl ? (
					<img
						src={mediaItem.coverImageUrl}
						alt={mediaItem.title}
						className={`w-full h-full ${isPodcast ? "object-contain" : "object-fill"}`}
						onError={(e) => {
							e.currentTarget.style.display = "none";
						}}
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
						No Cover
					</div>
				)}

				{shouldShowRatingStars && (
					<div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/70 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
				)}

				<div className="absolute inset-x-0 bottom-0 flex flex-col items-end">
					{(shouldShowPurchasedBadge || shouldShowType) && (
						<div className="flex flex-row items-center gap-1.5 mr-1.5 mb-1.5">
							{shouldShowPurchasedBadge && (
								<PurchasedBadge
									purchaseStatus={mediaItem.purchaseStatus}
									isOnDarkBackground
								/>
							)}

							{shouldShowType && (
								<TypeBadge
									type={mediaItem.type}
									className="bg-black/60 text-white backdrop-blur-sm"
								/>
							)}
						</div>
					)}

					{shouldShowRatingStars && (
						<div className="w-full grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr] [@media(hover:none)]:grid-rows-[1fr]">
							<div className="overflow-hidden">
								<RatingStars
									rating={mediaItem.rating}
									isOnDarkBackground
									starClassName="size-3.5"
									className="w-full justify-center py-1 bg-black/60 backdrop-blur-sm"
								/>
							</div>
						</div>
					)}
				</div>
			</div>
		</Link>
	);
}
