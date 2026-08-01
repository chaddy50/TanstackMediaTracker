import { useTranslation } from "react-i18next";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import { MediaItemStatus } from "#/lib/enums";
import { formatDate } from "#/lib/utils";

const STATUS_CLASSES: Record<string, string> = {
	want_to: "bg-gray-600 text-gray-200",
	backlog: "bg-gray-700 text-gray-300",
	next_up: "bg-purple-600 text-purple-100",
	in_progress: "bg-blue-600 text-blue-100",
	done: "bg-green-700 text-green-100",
	dropped: "bg-rose-700 text-rose-100",
	on_hold: "bg-amber-600 text-amber-100",
	waiting_for_next_release: "bg-sky-700 text-sky-100",
};

interface StatusBadgeProps {
	status: MediaItemStatus | undefined;
	expectedReleaseDate?: string | null;
	onClick?: () => void;
	disabled?: boolean;
}

export function StatusBadge(props: StatusBadgeProps) {
	const { status, expectedReleaseDate, onClick, disabled } = props;
	const { t } = useTranslation();
	if (!status) return null;

	const commonClasses = `text-xs px-2 py-0.5 rounded-full ${STATUS_CLASSES[status]}`;
	const isWaiting = status === MediaItemStatus.WAITING_FOR_NEXT_RELEASE;
	const formattedExpectedReleaseDate =
		isWaiting && expectedReleaseDate ? formatDate(expectedReleaseDate) : null;

	const badgeElement = onClick ? (
		<button
			type="button"
			onClick={onClick}
			className={`${commonClasses}`}
			disabled={disabled}
			data-testid="status-badge"
		>
			{t(`status.${status}`)}
		</button>
	) : (
		<span className={commonClasses} data-testid="status-badge">
			{t(`status.${status}`)}
		</span>
	);

	if (!formattedExpectedReleaseDate) {
		return badgeElement;
	}

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>{badgeElement}</TooltipTrigger>
				<TooltipContent>{formattedExpectedReleaseDate}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
