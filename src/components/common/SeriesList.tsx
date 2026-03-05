import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { StatusBadge } from "#/components/common/StatusBadge";
import { TypeBadge } from "#/components/common/TypeBadge";
import { SeriesCompletionBadge } from "#/components/seriesDetails/SeriesCompletionBadge";
import type { MediaItemStatus, MediaItemType } from "#/lib/enums";

interface SeriesListItem {
	id: number;
	name: string;
	type: MediaItemType;
	status: MediaItemStatus;
	isComplete: boolean;
	itemCount: number;
}

interface SeriesListProps {
	items: SeriesListItem[];
}

export function SeriesList({ items }: SeriesListProps) {
	const { t } = useTranslation();

	if (items.length === 0) {
		return (
			<p className="text-muted-foreground text-center py-12">
				{t("views.empty")}
			</p>
		);
	}

	return (
		<div className="flex flex-col divide-y divide-border">
			{items.map((seriesItem) => (
				<Link
					key={seriesItem.id}
					to="/series/$seriesId"
					params={{ seriesId: String(seriesItem.id) }}
					className="flex items-center gap-4 py-3 px-1 hover:bg-muted/50 rounded-md transition-colors"
				>
					<TypeBadge type={seriesItem.type} />
					<span className="flex-1 font-medium text-foreground">
						{seriesItem.name}
					</span>
					<span className="text-sm text-muted-foreground shrink-0">
						{t("views.seriesItemCount", { count: seriesItem.itemCount })}
					</span>
					<StatusBadge status={seriesItem.status} />
					<SeriesCompletionBadge isComplete={seriesItem.isComplete} />
				</Link>
			))}
		</div>
	);
}
