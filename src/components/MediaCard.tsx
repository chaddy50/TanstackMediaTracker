import { Link } from "@tanstack/react-router";

import { MediaItemStatus, type MediaItemType } from "@/lib/enums";
import { PurchasedBadge } from "./common/PurchasedBadge";
import { RatingStars } from "./common/rating/RatingStars";
import { SeriesLink } from "./common/SeriesLink";
import { StatusBadge } from "./common/StatusBadge";
import { TypeBadge } from "./common/TypeBadge";

type MediaCardItem = {
	id: number;
	status: MediaItemStatus;
	isPurchased: boolean;
	title: string;
	type: MediaItemType;
	coverImageUrl: string | null;
	rating: number;
	seriesId?: number | null | undefined;
	seriesName?: string | null | undefined;
};

interface MediaCardProps {
	mediaItem: MediaCardItem;
	shouldShowStatus?: boolean;
	shouldShowType?: boolean;
}

export function MediaCard({
	mediaItem,
	shouldShowStatus = true,
	shouldShowType = true,
}: MediaCardProps) {
	return (
		<Link
			to="/mediaItemDetails/$mediaItemId"
			params={{ mediaItemId: String(mediaItem.id) }}
			className="flex flex-col bg-card rounded-lg overflow-hidden border border-border hover:border-foreground/30 transition-colors"
		>
			<div className="aspect-2/3 bg-muted relative">
				{mediaItem.coverImageUrl ? (
					<img
						src={mediaItem.coverImageUrl}
						alt={mediaItem.title}
						className="w-full h-full object-fill"
						onError={(e) => {
							e.currentTarget.style.display = "none";
						}}
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
						No Cover
					</div>
				)}
			</div>

			<div className="p-2 flex flex-col gap-2">
				<p className="text-md font-medium text-card-foreground leading-snug line-clamp-2">
					{shouldShowType && (
						<span className="mr-2">
							<TypeBadge type={mediaItem.type} />
						</span>
					)}
					{mediaItem.title}
				</p>

				<p className="text-sm font-medium text-card-foreground leading-snug line-clamp-2">
					<SeriesLink
						seriesId={mediaItem.seriesId}
						seriesName={mediaItem.seriesName}
					/>
				</p>

				<div className="flex items-center gap-1.5 flex-wrap">
					{shouldShowStatus && <StatusBadge status={mediaItem.status} />}
					{mediaItem.status !== MediaItemStatus.IN_PROGRESS &&
						mediaItem.status !== MediaItemStatus.ON_HOLD &&
						mediaItem.status !== MediaItemStatus.COMPLETED &&
						mediaItem.status !== MediaItemStatus.DROPPED && (
							<PurchasedBadge isPurchased={mediaItem.isPurchased} />
						)}
				</div>

				<RatingStars rating={mediaItem.rating} />
			</div>
		</Link>
	);
}
