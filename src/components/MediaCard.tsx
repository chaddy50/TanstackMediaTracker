import { useTranslation } from "react-i18next";

import type { LibraryEntry } from "#/server/library";

const STATUS_CLASSES: Record<string, string> = {
	want_to: "bg-gray-600 text-gray-200",
	in_progress: "bg-blue-600 text-blue-100",
	completed: "bg-green-700 text-green-100",
	dropped: "bg-rose-700 text-rose-100",
	on_hold: "bg-amber-600 text-amber-100",
	backlog: "bg-gray-700 text-gray-300",
};

export function MediaCard({ entry }: { entry: LibraryEntry }) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-gray-600 transition-colors cursor-pointer">
			<div className="aspect-2/3 bg-gray-800 relative">
				{entry.coverImageUrl ? (
					<img
						src={entry.coverImageUrl}
						alt={entry.title}
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
					{entry.title}
				</p>

				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
						{t(`mediaType.${entry.type}`)}
					</span>
					<span
						className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLASSES[entry.status]}`}
					>
						{t(`status.${entry.status}`)}
					</span>
				</div>

				{entry.rating && (
					<p className="text-sm text-yellow-400 font-medium">
						★ {entry.rating}
					</p>
				)}
			</div>
		</div>
	);
}
