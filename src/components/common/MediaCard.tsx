import { Link } from "@tanstack/react-router";

import { MediaItemStatus, MediaItemType } from "#/lib/enums";
import { PurchasedBadge } from "./PurchasedBadge";
import { RatingStars } from "./rating/RatingStars";
import { StatusBadge } from "./StatusBadge";
import { TypeBadge } from "./TypeBadge";

type MediaCardItem = {
	id: number;
	status: MediaItemStatus;
	isPurchased: boolean;
	title: string;
	type: MediaItemType;
	coverImageUrl: string | null;
	rating: number;
	completedAt?: string | null;
	expectedReleaseDate?: string | null;
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
			className="flex flex-col bg-card rounded-lg overflow-hidden border border-border hover:border-foreground/30 transition-colors self-start"
		>
			<div className={`${mediaItem.type === MediaItemType.PODCAST ? "aspect-square" : "aspect-2/3"} bg-muted relative`}>
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

				{mediaItem.seriesName && (
					<p className="text-sm font-medium text-card-foreground leading-snug line-clamp-2">
						{mediaItem.seriesName}
					</p>
				)}

				<div className="flex items-center gap-1.5 flex-wrap">
					{shouldShowStatus && (
						<StatusBadge
							status={mediaItem.status}
							completedAt={mediaItem.completedAt}
							expectedReleaseDate={mediaItem.expectedReleaseDate}
						/>
					)}
					{mediaItem.status !== MediaItemStatus.IN_PROGRESS &&
						mediaItem.status !== MediaItemStatus.ON_HOLD &&
						mediaItem.status !== MediaItemStatus.COMPLETED &&
						mediaItem.status !== MediaItemStatus.DROPPED && (
							<PurchasedBadge isPurchased={mediaItem.isPurchased} />
						)}
				</div>

				{mediaItem.status === MediaItemStatus.COMPLETED && (
					<RatingStars rating={mediaItem.rating} />
				)}
			</div>
		</Link>
	);
}
