import { Button } from "#/components/ui/button";
import { formatDateRange } from "#/lib/utils";
import { RatingStars } from "@/components/common/rating/RatingStars";
import type { MediaItemDetails } from "@/server/mediaItem";
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
					<p className="text-sm text-foreground/80 line-clamp-3">
						{instance.reviewText}
					</p>
				)}
				{instance.fictionRating && (
					<div className="flex flex-col gap-1 mt-0.5">
						{(
							Object.entries(instance.fictionRating) as [keyof typeof instance.fictionRating, { rating: number; comment?: string }][]
						).filter(([, field]) => field.comment).map(([key, field]) => (
							<p key={key} className="text-sm">
								<span className="text-muted-foreground">{t(`fictionRating.${key}`)}: </span>
								<span className="text-foreground/80">{field.comment}</span>
							</p>
						))}
					</div>
				)}
			</div>
			<Button variant="ghost" size="sm" onClick={onEdit} className="shrink-0">
				{t("mediaItemDetails.edit")}
			</Button>
		</div>
	);
}
