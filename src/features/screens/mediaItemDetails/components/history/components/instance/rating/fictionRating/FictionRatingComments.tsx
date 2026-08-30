import { useTranslation } from "react-i18next";
import type { FictionRating } from "#/database/schema";
import { RatingStars } from "../ratingStars/RatingStars";
import { FICTION_RATING_FIELDS } from "./fictionRating";

export function FictionRatingComments({
	fictionRating,
}: {
	fictionRating: FictionRating;
}) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col gap-1 mt-0.5">
			{FICTION_RATING_FIELDS.map((field) => {
				const ratingField = fictionRating[field];
				return (
					<div
						key={field}
						className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2"
					>
						<div className="flex items-center gap-1.5">
							<span className="text-sm text-muted-foreground w-20">
								{t(`fictionRating.${field}`)}
							</span>
							<RatingStars
								rating={ratingField.rating}
								shouldShowIfNoRating={true}
								starClassName="size-3.5"
							/>
						</div>
						{ratingField.comment && (
							<span className="min-w-0 text-sm text-foreground/80">
								{ratingField.comment}
							</span>
						)}
					</div>
				);
			})}
		</div>
	);
}
