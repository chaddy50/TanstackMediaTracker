import { useTranslation } from "react-i18next";
import type { NextItemStatus } from "#/lib/enums";

const STATUS_CLASSES: Record<NextItemStatus, string> = {
	waiting_for_release: "bg-secondary text-secondary-foreground",
	available: "bg-blue-700 text-blue-100",
	purchased: "bg-green-700 text-green-100",
};

interface NextItemStatusBadgeProps {
	status: NextItemStatus;
}

export function NextItemStatusBadge({ status }: NextItemStatusBadgeProps) {
	const { t } = useTranslation();

	return (
		<span
			className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_CLASSES[status]}`}
		>
			{t(`nextItemStatus.${status}`)}
		</span>
	);
}
