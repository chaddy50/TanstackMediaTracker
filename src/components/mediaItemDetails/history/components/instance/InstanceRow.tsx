import { useTranslation } from "react-i18next";

import { Button } from "#/components/ui/button";
import { formatDateRange } from "#/lib/utils";
import type { MediaItemDetails } from "@/server/mediaItem";

export function InstanceRow({
	index,
	instance,
	onEdit,
}: {
	index: number;
	instance: MediaItemDetails["instances"][number];
	onEdit: () => void;
}) {
	const { t } = useTranslation();
	const dateRange = formatDateRange(instance.startedAt, instance.completedAt);

	return (
		<div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-gray-800 bg-gray-900">
			<div className="flex flex-col gap-1.5 min-w-0">
				<div className="flex items-center gap-3 flex-wrap">
					<span className="text-sm font-medium text-gray-400">#{index}</span>
					{instance.rating && (
						<span className="text-yellow-400 text-sm font-medium">
							★ {instance.rating}
						</span>
					)}
					{dateRange && (
						<span className="text-gray-400 text-sm">{dateRange}</span>
					)}
				</div>
				{instance.reviewText && (
					<p className="text-sm text-gray-300 line-clamp-3">
						{instance.reviewText}
					</p>
				)}
			</div>
			<Button variant="ghost" size="sm" onClick={onEdit} className="shrink-0">
				{t("mediaItemDetails.edit")}
			</Button>
		</div>
	);
}
