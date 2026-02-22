import type { mediaTypeEnum } from "@/db/schema";
import { useTranslation } from "react-i18next";

interface TypeBadgeProps {
	type: (typeof mediaTypeEnum.enumValues)[number];
}

export function TypeBadge(props: TypeBadgeProps) {
	const { type } = props;
	const { t } = useTranslation();
	return (
		<span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
			{t(`mediaType.${type}`)}
		</span>
	);
}
