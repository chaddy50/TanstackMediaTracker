import { cn } from "#/lib/utils";
import { RatingStar } from "./RatingStar";

interface RatingStarsProps {
	rating: number;
	shouldShowIfNoRating?: boolean;
	updateRating?: (value: number) => void;
	isOnDarkBackground?: boolean;
	starClassName?: string;
	className?: string;
}

export function RatingStars({
	rating,
	updateRating,
	shouldShowIfNoRating = false,
	isOnDarkBackground = false,
	starClassName,
	className,
}: RatingStarsProps) {
	if (!shouldShowIfNoRating && rating === 0) {
		return null;
	}
	const roundedRating = Math.round(rating);
	return (
		<p className={cn("flex flex-row", className)} data-testid="rating-stars">
			<RatingStar
				starNumber={1}
				rating={roundedRating}
				updateRating={updateRating}
				isOnDarkBackground={isOnDarkBackground}
				className={starClassName}
			/>
			<RatingStar
				starNumber={2}
				rating={roundedRating}
				updateRating={updateRating}
				isOnDarkBackground={isOnDarkBackground}
				className={starClassName}
			/>
			<RatingStar
				starNumber={3}
				rating={roundedRating}
				updateRating={updateRating}
				isOnDarkBackground={isOnDarkBackground}
				className={starClassName}
			/>
			<RatingStar
				starNumber={4}
				rating={roundedRating}
				updateRating={updateRating}
				isOnDarkBackground={isOnDarkBackground}
				className={starClassName}
			/>
			<RatingStar
				starNumber={5}
				rating={roundedRating}
				updateRating={updateRating}
				isOnDarkBackground={isOnDarkBackground}
				className={starClassName}
			/>
		</p>
	);
}
