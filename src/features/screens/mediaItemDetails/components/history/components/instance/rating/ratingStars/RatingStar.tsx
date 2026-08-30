import { Star } from "lucide-react";
import type { MouseEvent } from "react";
import { getStarFillLevel } from "#/lib/rating";
import { cn } from "#/lib/utils";

interface RatingStarProps {
	starNumber: number;
	rating: number;
	roundedRating: number;
	updateRating?: (value: number) => void;
	isOnDarkBackground?: boolean;
	className?: string;
}

export function RatingStar({
	rating,
	roundedRating,
	starNumber,
	updateRating,
	isOnDarkBackground = false,
	className,
}: RatingStarProps) {
	const fillLevel = getStarFillLevel(starNumber, roundedRating);
	const shouldStarBeFilled = fillLevel === "full";
	const shouldStarBeHalfFilled = fillLevel === "half";
	const shouldStarBeClickable = !!updateRating;
	const filledClasses = isOnDarkBackground
		? "text-yellow-300"
		: "text-yellow-800 dark:text-yellow-300";
	const unfilledClasses = isOnDarkBackground
		? "text-yellow-300/30"
		: "text-yellow-800/30 dark:text-yellow-300/30";
	return (
		<span
			className="relative inline-flex"
			data-testid="rating-star"
			data-fill={fillLevel}
		>
			<Star
				className={cn(
					shouldStarBeClickable ? "cursor-pointer" : undefined,
					shouldStarBeFilled ? filledClasses : unfilledClasses,
					className,
				)}
				fill={shouldStarBeFilled ? "currentColor" : "none"}
				onClick={
					shouldStarBeClickable
						? (event) => {
								const clickedRating = getClickedRating(event, starNumber);
								if (rating === clickedRating) {
									updateRating(0);
								} else {
									updateRating(clickedRating);
								}
							}
						: undefined
				}
			/>
			{/* Lucide cannot fill a star partway, so a half is a filled copy clipped
			    to the left of the unfilled one. It stays click-through so the base
			    star below keeps owning the interaction. */}
			{shouldStarBeHalfFilled && (
				<span
					className="pointer-events-none absolute inset-y-0 left-0 w-1/2 overflow-hidden"
					aria-hidden="true"
				>
					<Star className={cn(filledClasses, className)} fill="currentColor" />
				</span>
			)}
		</span>
	);
}

/** Each star is two targets: its left half records a `.5`, its right the whole. */
function getClickedRating(
	event: MouseEvent<SVGSVGElement>,
	starNumber: number,
): number {
	const bounds = event.currentTarget.getBoundingClientRect();
	const isLeftHalfClicked = event.clientX - bounds.left < bounds.width / 2;
	return isLeftHalfClicked ? starNumber - 0.5 : starNumber;
}
