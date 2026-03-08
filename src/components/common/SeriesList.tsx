import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { NextItemStatusBadge } from "#/components/common/NextItemStatusBadge";
import { StatusBadge } from "#/components/common/StatusBadge";
import { TypeBadge } from "#/components/common/TypeBadge";
import { SeriesCompletionBadge } from "#/components/seriesDetails/SeriesCompletionBadge";
import type { MediaItemStatus, MediaItemType, NextItemStatus } from "#/lib/enums";

interface SeriesListItem {
	id: number;
	name: string;
	type: MediaItemType;
	status: MediaItemStatus;
	isComplete: boolean;
	itemCount: number;
	nextItemStatus: NextItemStatus | null;
}

interface SeriesListProps {
	items: SeriesListItem[];
}

export function SeriesList({ items }: SeriesListProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();

	if (items.length === 0) {
		return (
			<p className="text-muted-foreground text-center py-12">
				{t("views.empty")}
			</p>
		);
	}

	const hasAnyNextItemStatus = items.some((item) => item.nextItemStatus !== null);
	const thClass = "md:sticky md:top-[60px] z-9 bg-background border-b border-border px-2 py-2 text-left text-xs text-muted-foreground font-medium uppercase tracking-wide whitespace-nowrap";

	return (
		<>
			{/* Mobile card list */}
			<ul className="flex flex-col divide-y divide-border md:hidden">
				{items.map((seriesItem) => (
					<li key={seriesItem.id}>
						<button
							type="button"
							onClick={() =>
								navigate({
									to: "/series/$seriesId",
									params: { seriesId: String(seriesItem.id) },
								})
							}
							className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex flex-col gap-1.5"
						>
							<div className="flex items-center gap-2 flex-wrap">
								<TypeBadge type={seriesItem.type} />
								<span className="font-medium text-foreground text-sm leading-snug">
									{seriesItem.name}
								</span>
							</div>
							<div className="flex items-center gap-2 flex-wrap">
								<StatusBadge status={seriesItem.status} />
								<SeriesCompletionBadge isComplete={seriesItem.isComplete} />
								{seriesItem.nextItemStatus && (
									<NextItemStatusBadge status={seriesItem.nextItemStatus} />
								)}
								<span className="text-xs text-muted-foreground">
									{t("views.seriesItemCount", { count: seriesItem.itemCount })}
								</span>
							</div>
						</button>
					</li>
				))}
			</ul>

			{/* Desktop table */}
			<div className="hidden md:block overflow-x-auto">
				<table className="w-full border-collapse">
					<thead>
						<tr>
							<th className={thClass} />
							<th className={thClass}>{t("series.columns.name")}</th>
							<th className={`${thClass} text-right`}>{t("series.columns.items")}</th>
							<th className={thClass}>{t("series.columns.status")}</th>
							{hasAnyNextItemStatus && (
								<th className={thClass}>{t("series.columns.nextItem")}</th>
							)}
							<th className={thClass}>{t("series.columns.complete")}</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{items.map((seriesItem) => (
							<tr
								key={seriesItem.id}
								onClick={() =>
									navigate({
										to: "/series/$seriesId",
										params: { seriesId: String(seriesItem.id) },
									})
								}
								className="hover:bg-muted/50 cursor-pointer transition-colors"
							>
								<td className="px-2 py-3">
									<TypeBadge type={seriesItem.type} />
								</td>
								<td className="px-2 py-3 font-medium text-foreground">
									{seriesItem.name}
								</td>
								<td className="px-2 py-3 text-sm text-muted-foreground text-right whitespace-nowrap">
									{t("views.seriesItemCount", { count: seriesItem.itemCount })}
								</td>
								<td className="px-2 py-3">
									<StatusBadge status={seriesItem.status} />
								</td>
								{hasAnyNextItemStatus && (
									<td className="px-2 py-3">
										{seriesItem.nextItemStatus && (
											<NextItemStatusBadge status={seriesItem.nextItemStatus} />
										)}
									</td>
								)}
								<td className="px-2 py-3">
									<SeriesCompletionBadge isComplete={seriesItem.isComplete} />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</>
	);
}
