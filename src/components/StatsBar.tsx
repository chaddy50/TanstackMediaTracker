import { useTranslation } from "react-i18next";
import type { FilterAndSortOptions } from "#/database/schema";
import {
	isFilteredToCompletedOnly,
	shouldShowCompletedCount,
	shouldShowDroppedCount,
	shouldShowPurchasedCount,
} from "#/lib/filterAndSort";
import type { ItemStats } from "#/lib/queries/types";

interface StatsBarProps {
	stats: ItemStats;
	/**
	 * The filters the counts were gathered under. A count the filters have
	 * already settled is dropped from the bar rather than shown as a number the
	 * user could have predicted.
	 */
	filters?: FilterAndSortOptions | null;
}

export function StatsBar({ stats, filters }: StatsBarProps) {
	const { t } = useTranslation();

	// An empty result set has nothing worth summarizing, and a row of zeros would
	// only crowd the "no items found" message.
	if (stats.totalCount === 0) {
		return null;
	}

	// A view of nothing but finished items is a record of what was consumed, so
	// what was paid for along the way has no bearing on reading it.
	const isPurchasedShown =
		shouldShowPurchasedCount(filters?.purchaseStatuses) &&
		!isFilteredToCompletedOnly(filters?.statuses);
	const isCompletedShown = shouldShowCompletedCount(filters?.statuses);
	// Most views have nothing dropped, and a permanent zero is just noise.
	const isDroppedShown =
		stats.droppedCount > 0 && shouldShowDroppedCount(filters?.statuses);

	// Gutters match the top bar's own, since this renders inside its sticky
	// header rather than above the list. Each optional section carries its own
	// leading divider, so hiding one never strands a separator.
	return (
		<div
			data-testid="stats-bar"
			className="px-3 pb-2 md:px-6 md:pb-3 flex flex-wrap items-center gap-x-5 gap-y-1"
		>
			<Stat label={t("stats.items")} value={stats.totalCount} />
			{isPurchasedShown && (
				<>
					<Divider />
					<Stat label={t("stats.purchased")} value={stats.purchasedCount} />
				</>
			)}
			{isCompletedShown && (
				<>
					<Divider />
					{/* The uncompleted count is left off deliberately: with the total
					    right there, it is what the completed count already tells you. */}
					<Stat label={t("stats.completed")} value={stats.completedCount} />
				</>
			)}
			{isDroppedShown && (
				<>
					<Divider />
					<Stat label={t("stats.dropped")} value={stats.droppedCount} />
				</>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

interface StatProps {
	label: string;
	value: number;
}

/** Decorative, so it is hidden from assistive tech rather than announced. */
function Divider() {
	return (
		<div
			aria-hidden="true"
			data-testid="stats-divider"
			className="h-5 w-px shrink-0 bg-border"
		/>
	);
}

function Stat({ label, value }: StatProps) {
	return (
		<div className="flex items-baseline gap-1.5">
			{/* Tabular figures so the numbers hold their place as counts change. */}
			<span className="text-lg font-semibold tabular-nums">{value}</span>
			<span className="text-sm text-muted-foreground">{label}</span>
		</div>
	);
}
