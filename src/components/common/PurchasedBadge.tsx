import { DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";

interface PurchasedBadgeProps {
	isPurchased: boolean;
	onClick?: () => void;
}

export function PurchasedBadge({ isPurchased, onClick }: PurchasedBadgeProps) {
	const { t } = useTranslation();

	const colorClasses = isPurchased
		? "bg-green-700 text-green-100"
		: "bg-gray-700 text-gray-400";

	const label = isPurchased
		? t("purchased.purchased")
		: t("purchased.notPurchased");

	const commonClasses = `inline-flex items-center justify-center p-1.5 rounded-full transition-colors duration-300 ${colorClasses}`;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				{onClick ? (
					<button type="button" onClick={onClick} className={commonClasses}>
						<DollarSign size={12} />
					</button>
				) : (
					<span className={commonClasses}>
						<DollarSign size={12} />
					</span>
				)}
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}
