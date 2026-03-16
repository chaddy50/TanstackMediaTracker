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
	onClick?: () => void;
}

const COLOR_CLASSES: Record<PurchaseStatus, string> = {
	not_purchased: "bg-gray-700 text-gray-400",
	want_to_buy: "bg-amber-600 text-amber-100",
	purchased: "bg-green-700 text-green-100",
};

export function PurchasedBadge({ purchaseStatus, onClick }: PurchasedBadgeProps) {
	const { t } = useTranslation();

	const commonClasses = `inline-flex items-center justify-center p-1.5 rounded-full transition-colors duration-300 ${COLOR_CLASSES[purchaseStatus]}`;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				{onClick ? (
					<button type="button" onClick={onClick} className={commonClasses} data-testid="purchased-badge">
						<DollarSign size={12} />
					</button>
				) : (
					<span className={commonClasses} data-testid="purchased-badge">
						<DollarSign size={12} />
					</span>
				)}
			</TooltipTrigger>
			<TooltipContent>{t(`purchaseStatus.${purchaseStatus}`)}</TooltipContent>
		</Tooltip>
	);
}
