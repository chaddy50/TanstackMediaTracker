import { DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import type { PurchaseStatus } from "#/lib/enums";

interface PurchasedBadgeProps {
	purchaseStatus: PurchaseStatus;
	isOnDarkBackground?: boolean;
	onClick?: () => void;
}

const COLOR_CLASSES: Record<PurchaseStatus, string> = {
	not_purchased: "bg-gray-700 text-gray-400",
	want_to_buy: "bg-amber-600 text-amber-100",
	purchased: "bg-green-700 text-green-100",
};

const DARK_BACKGROUND_CLASSES = "bg-black/60 text-white backdrop-blur-sm";

export function PurchasedBadge({
	purchaseStatus,
	isOnDarkBackground = false,
	onClick,
}: PurchasedBadgeProps) {
	const { t } = useTranslation();

	const colorClasses = isOnDarkBackground
		? DARK_BACKGROUND_CLASSES
		: COLOR_CLASSES[purchaseStatus];
	const commonClasses = `inline-flex items-center justify-center p-1.5 rounded-full transition-colors duration-300 ${colorClasses}`;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				{onClick ? (
					<button
						type="button"
						onClick={onClick}
						className={commonClasses}
						data-testid="purchased-badge"
					>
						<DollarSign className="size-3.5" />
					</button>
				) : (
					<span className={commonClasses} data-testid="purchased-badge">
						<DollarSign className="size-3.5" />
					</span>
				)}
			</TooltipTrigger>
			<TooltipContent>{t(`purchaseStatus.${purchaseStatus}`)}</TooltipContent>
		</Tooltip>
	);
}
