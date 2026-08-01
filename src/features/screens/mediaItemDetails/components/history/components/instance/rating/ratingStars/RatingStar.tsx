import { Star } from "lucide-react";
import { cn } from "#/lib/utils";

interface RatingStarProps {
	starNumber: number;
	rating: number;
	updateRating?: (value: number) => void;
	isOnDarkBackground?: boolean;
	className?: string;
}

export function RatingStar({
	rating,
	starNumber,
	updateRating,
	isOnDarkBackground = false,
	className,
}: RatingStarProps) {
	const shouldStarBeFilled = starNumber <= rating;
	const shouldStarBeClickable = !!updateRating;
	const filledClasses = isOnDarkBackground
		? "text-yellow-300"
		: "text-yellow-800 dark:text-yellow-300";
	const unfilledClasses = isOnDarkBackground
		? "text-yellow-300/30"
		: "text-yellow-800/30 dark:text-yellow-300/30";
	return (
		<Star
			className={cn(
				shouldStarBeClickable ? "cursor-pointer" : undefined,
				shouldStarBeFilled ? filledClasses : unfilledClasses,
				className,
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
