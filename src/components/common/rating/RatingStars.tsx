import { RatingStar } from "./RatingStar";

interface RatingStarsProps {
	rating: number;
	shouldShowIfNoRating?: boolean;
	updateRating?: (value: number) => void;
}

export function RatingStars({
	rating,
	updateRating,
	shouldShowIfNoRating = false,
}: RatingStarsProps) {
	if (!shouldShowIfNoRating && rating === 0) {
		return null;
	}
	const roundedRating = Math.round(rating);
	return (
		<p className="flex flex-row">
			<RatingStar starNumber={1} rating={roundedRating} updateRating={updateRating} />
			<RatingStar starNumber={2} rating={roundedRating} updateRating={updateRating} />
			<RatingStar starNumber={3} rating={roundedRating} updateRating={updateRating} />
			<RatingStar starNumber={4} rating={roundedRating} updateRating={updateRating} />
			<RatingStar starNumber={5} rating={roundedRating} updateRating={updateRating} />
		</p>
	);
}
