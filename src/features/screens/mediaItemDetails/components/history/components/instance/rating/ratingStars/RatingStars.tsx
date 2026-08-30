import { useTranslation } from "react-i18next";
import {
	formatRatingValue,
	MAXIMUM_RATING,
	roundToNearestHalfStar,
} from "#/lib/rating";
import { cn } from "#/lib/utils";
import { RatingStar } from "./RatingStar";

const STAR_NUMBERS = Array.from(
	{ length: MAXIMUM_RATING },
	(_, index) => index + 1,
);

interface RatingStarsProps {
	rating: number;
	shouldShowIfNoRating?: boolean;
	shouldShowValue?: boolean;
	updateRating?: (value: number) => void;
	isOnDarkBackground?: boolean;
	starClassName?: string;
	className?: string;
}

export function RatingStars({
	rating,
	updateRating,
	shouldShowIfNoRating = false,
	shouldShowValue = false,
	isOnDarkBackground = false,
	starClassName,
	className,
}: RatingStarsProps) {
	const { t } = useTranslation();

	if (!shouldShowIfNoRating && rating === 0) {
		return null;
	}

	const roundedRating = roundToNearestHalfStar(rating);
	// The stars show the rounded rating; the text shows what was actually
	// stored, which is the whole point of printing it.
	const formattedRating = formatRatingValue(rating);
	const label = t("rating.outOfFive", { rating: formattedRating });

	return (
		<p
			className={cn("flex flex-row items-center", className)}
			data-testid="rating-stars"
			// The row of stars reads as one graphic, so it is named as a whole
			// rather than leaving five unlabelled icons behind.
			role="img"
			aria-label={label}
			title={label}
		>
			{STAR_NUMBERS.map((starNumber) => (
				<RatingStar
					key={starNumber}
					starNumber={starNumber}
					rating={rating}
					roundedRating={roundedRating}
					updateRating={updateRating}
					isOnDarkBackground={isOnDarkBackground}
					className={starClassName}
				/>
			))}
			{shouldShowValue && rating > 0 && (
				<span className="ml-1 text-sm text-muted-foreground tabular-nums">
					{formattedRating}
				</span>
			)}
		</p>
	);
}
