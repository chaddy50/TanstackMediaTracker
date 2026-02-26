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

	const commonClasses = `flex items-center text-xs px-2 py-0.5 rounded-full transition-colors duration-300 ${colorClasses}`;

	const textClasses = `overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
		isPurchased ? "max-w-20 ml-0.5" : "max-w-0"
	}`;

	const content = (
		<>
			<DollarSign size={11} />
			<span className={textClasses}>{t("purchased.purchased")}</span>
		</>
	);

	if (onClick) {
		return (
			<button type="button" onClick={onClick} className={commonClasses} aria-label={label}>
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
