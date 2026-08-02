import { useTranslation } from "react-i18next";
import type { FictionRating, FictionRatingField } from "#/database/schema";
import { RatingStars } from "../ratingStars/RatingStars";

export function FictionRatingComments({
	fictionRating,
}: {
	fictionRating: FictionRating;
}) {
	const { t } = useTranslation();

	const fields = Object.entries(fictionRating) as [
		keyof FictionRating,
		FictionRatingField,
	][];

	return (
		<div className="flex flex-col gap-1 mt-0.5">
			{fields.map(([key, field]) => (
				<div
					key={key}
					className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2"
				>
					<div className="flex items-center gap-1.5">
						<span className="text-sm text-muted-foreground w-20">
							{t(`fictionRating.${key}`)}
						</span>
						<RatingStars
							rating={field.rating}
							shouldShowIfNoRating={true}
							starClassName="size-3.5"
						/>
					</div>
					{field.comment && (
						<span className="min-w-0 text-sm text-foreground/80">
							{field.comment}
						</span>
					)}
				</div>
			))}
		</div>
	);
}
