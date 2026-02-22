import { cn } from "#/lib/utils";

export function RatingBadge({
	rating,
	className,
}: {
	rating: string;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-400/15 dark:text-yellow-300",
				className,
			)}
		>
			★ {rating}
		</span>
	);
}
