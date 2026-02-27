import { BookOpen, Film, Gamepad2, Tv } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import { MediaItemType } from "#/lib/enums";

const TYPE_ICONS: Record<MediaItemType, React.ComponentType<{ className?: string }>> = {
	[MediaItemType.BOOK]: BookOpen,
	[MediaItemType.MOVIE]: Film,
	[MediaItemType.TV_SHOW]: Tv,
	[MediaItemType.VIDEO_GAME]: Gamepad2,
};

interface TypeBadgeProps {
	type: MediaItemType;
}

export function TypeBadge({ type }: TypeBadgeProps) {
	const { t } = useTranslation();
	const Icon = TYPE_ICONS[type];

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="inline-flex items-center justify-center p-1.5 rounded-full bg-secondary text-secondary-foreground">
					<Icon className="size-3.5" />
				</span>
			</TooltipTrigger>
			<TooltipContent>{t(`mediaType.${type}`)}</TooltipContent>
		</Tooltip>
	);
}
