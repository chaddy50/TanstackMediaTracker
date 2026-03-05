import { Button } from "#/components/ui/button";
import { formatDateRange } from "#/lib/utils";
import { ExpandableTextBlock } from "#/components/common/ExpandableTextBlock";
import { FictionRatingComments } from "#/components/common/rating/FictionRatingComments";
import { RatingStars } from "#/components/common/rating/RatingStars";
import type { MediaItemDetails } from "#/server/mediaItem";
import { useTranslation } from "react-i18next";

export function InstanceRow({
	index,
	instance,
	onEdit,
}: {
	index: number;
	instance: MediaItemDetails["instances"][number];
	onEdit: () => void;
}) {
	const { t } = useTranslation();
	const dateRange = formatDateRange(instance.startedAt, instance.completedAt);

	return (
		<div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border bg-card">
			<div className="flex flex-col gap-1.5 min-w-0">
				<div className="flex items-center gap-3 flex-wrap">
					<span className="text-sm font-medium text-muted-foreground">
						#{index}
					</span>
					{dateRange && (
						<span className="text-muted-foreground text-sm">{dateRange}</span>
					)}
					<RatingStars rating={instance.rating} />
				</div>
				{instance.reviewText && (
					<ExpandableTextBlock text={instance.reviewText} maxLines={5} />
				)}
				{instance.fictionRating && (
					<FictionRatingComments fictionRating={instance.fictionRating} />
				)}
				{instance.seasonReviews && instance.seasonReviews.length > 0 && (
					<div className="flex flex-col gap-2 mt-1 pt-2 border-t border-border">
						{[...instance.seasonReviews]
							.sort((a, b) => a.season - b.season)
							.map((seasonReview) => {
								const seasonDateRange = formatDateRange(
									seasonReview.startedAt || null,
									seasonReview.completedAt || null,
								);
								return (
									<div key={seasonReview.season} className="flex flex-col gap-1">
										<div className="flex items-center gap-3 flex-wrap">
											<span className="text-sm font-medium text-muted-foreground">
												{t("mediaItemDetails.seasonN", {
													season: seasonReview.season,
												})}
											</span>
											{seasonDateRange && (
												<span className="text-muted-foreground text-sm">
													{seasonDateRange}
												</span>
											)}
											<RatingStars rating={seasonReview.rating} />
										</div>
										{seasonReview.fictionRating && (
											<FictionRatingComments
												fictionRating={seasonReview.fictionRating}
											/>
										)}
										{seasonReview.reviewText && (
											<ExpandableTextBlock
												text={seasonReview.reviewText}
												maxLines={3}
											/>
										)}
									</div>
								);
							})}
					</div>
				)}
			</div>
			<Button variant="ghost" size="sm" onClick={onEdit} className="shrink-0">
				{t("mediaItemDetails.edit")}
			</Button>
		</div>
	);
}
