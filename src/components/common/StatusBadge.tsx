import { type MediaItemStatus } from "@/lib/enums";
import { useTranslation } from "react-i18next";

const STATUS_CLASSES: Record<string, string> = {
	want_to: "bg-gray-600 text-gray-200",
	backlog: "bg-gray-700 text-gray-300",
	next_up: "bg-purple-600 text-purple-100",
	in_progress: "bg-blue-600 text-blue-100",
	completed: "bg-green-700 text-green-100",
	dropped: "bg-rose-700 text-rose-100",
	on_hold: "bg-amber-600 text-amber-100",
	waiting_for_next_release: "bg-sky-700 text-sky-100",
};

interface StatusBadgeProps {
	status: MediaItemStatus | undefined;
	onClick?: () => void;
	disabled?: boolean;
}

export function StatusBadge(props: StatusBadgeProps) {
	const { status, onClick, disabled } = props;
	const { t } = useTranslation();
	if (!status) return null;

	const commonClasses = `text-xs px-2 py-0.5 rounded-full ${STATUS_CLASSES[status]}`;

	if (onClick) {
		return (
			<button
				type="button"
				onClick={onClick}
				className={`${commonClasses}`}
				disabled={disabled}
			>
				{t(`status.${status}`)}
			</button>
		);
	}

	return <span className={commonClasses}>{t(`status.${status}`)}</span>;
}
