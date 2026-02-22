import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { LibraryItem } from "#/server/library";

const STATUS_CLASSES: Record<string, string> = {
	want_to: "bg-gray-600 text-gray-200",
	in_progress: "bg-blue-600 text-blue-100",
	completed: "bg-green-700 text-green-100",
	dropped: "bg-rose-700 text-rose-100",
	on_hold: "bg-amber-600 text-amber-100",
	backlog: "bg-gray-700 text-gray-300",
};

export function MediaCard({ mediaItem }: { mediaItem: LibraryItem }) {
	const { t } = useTranslation();

	return (
		<Link
			to="/mediaItemDetails/$mediaItemId"
			params={{ mediaItemId: String(mediaItem.id) }}
			className="flex flex-col bg-card rounded-lg overflow-hidden border border-border hover:border-foreground/30 transition-colors"
		>
			<div className="aspect-2/3 bg-muted relative">
				{mediaItem.coverImageUrl ? (
					<img
						src={mediaItem.coverImageUrl}
						alt={mediaItem.title}
						className="w-full h-full object-cover"
						onError={(e) => {
							e.currentTarget.style.display = "none";
						}}
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
						No Cover
					</div>
				)}
			</div>

			<div className="p-3 flex flex-col gap-2">
				<p className="text-sm font-medium text-card-foreground leading-snug line-clamp-2">
					{mediaItem.title}
				</p>

				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
						{t(`mediaType.${mediaItem.type}`)}
					</span>
					<span
						className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLASSES[mediaItem.status]}`}
					>
						{t(`status.${mediaItem.status}`)}
					</span>
				</div>

				{mediaItem.rating && (
					<span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-400/15 dark:text-yellow-300 self-start">
						★ {mediaItem.rating}
					</span>
				)}
			</div>
		</Link>
	);
}
