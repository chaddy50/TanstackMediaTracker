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
			className="flex flex-col bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-gray-600 transition-colors"
		>
			<div className="aspect-2/3 bg-gray-800 relative">
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
					<div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
						No Cover
					</div>
				)}
			</div>

			<div className="p-3 flex flex-col gap-2">
				<p className="text-sm font-medium text-white leading-snug line-clamp-2">
					{mediaItem.title}
				</p>

				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
						{t(`mediaType.${mediaItem.type}`)}
					</span>
					<span
						className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLASSES[mediaItem.status]}`}
					>
						{t(`status.${mediaItem.status}`)}
					</span>
				</div>

				{mediaItem.rating && (
					<p className="text-sm text-yellow-400 font-medium">
						★ {mediaItem.rating}
					</p>
				)}
			</div>
		</Link>
	);
}
