import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { RatingBadge } from "#/components/common/RatingBadge";
import type { LibraryItem } from "#/server/library";
import { StatusBadge } from "./common/StatusBadge";
import { TypeBadge } from "./common/TypeBadge";

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
					<TypeBadge type={mediaItem.type} />
					<StatusBadge status={mediaItem.status} />
				</div>

				{mediaItem.rating && (
					<RatingBadge rating={mediaItem.rating} className="self-start" />
				)}
			</div>
		</Link>
	);
}
