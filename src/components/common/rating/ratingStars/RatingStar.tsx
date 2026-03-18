import { cn } from "#/lib/utils";
import { Star } from "lucide-react";

interface RatingStarProps {
	starNumber: number;
	rating: number;
	updateRating?: (value: number) => void;
}

export function RatingStar({
	rating,
	starNumber,
	updateRating,
}: RatingStarProps) {
	const shouldStarBeFilled = starNumber <= rating;
	const shouldStarBeClickable = !!updateRating;
	return (
		<Star
			className={cn(
				shouldStarBeClickable ? "cursor-pointer" : undefined,
				shouldStarBeFilled
					? "text-yellow-800 dark:text-yellow-300"
					: "text-yellow-800/30 dark:text-yellow-300/30",
			)}
			fill={shouldStarBeFilled ? "currentColor" : "none"}
			onClick={
				shouldStarBeClickable
					? () => {
							if (rating === starNumber) {
								updateRating(0);
							} else {
								updateRating(starNumber);
							}
						}
					: undefined
			}
		/>
	);
}
