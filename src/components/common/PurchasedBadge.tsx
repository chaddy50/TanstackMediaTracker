import { DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PurchasedBadgeProps {
	isPurchased: boolean;
	onClick?: () => void;
}

export function PurchasedBadge(props: PurchasedBadgeProps) {
	const { isPurchased, onClick } = props;
	const { t } = useTranslation();

	const colorClasses = isPurchased
		? "bg-green-700 text-green-100"
		: "bg-gray-700 text-gray-400";

	const label = isPurchased
		? t("purchased.purchased")
		: t("purchased.notPurchased");

	const commonClasses = `flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full transition-colors duration-300 ${colorClasses}`;

	const content = (
		<>
			<DollarSign size={11} />
			{label}
		</>
	);

	if (onClick) {
		return (
			<button type="button" onClick={onClick} className={commonClasses}>
				{content}
			</button>
		);
	}

	return (
		<span role="img" className={commonClasses} aria-label={label}>
			{content}
		</span>
	);
}
