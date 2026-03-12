import { useTranslation } from "react-i18next";

import { MediaCard } from "#/components/common/MediaCard";
import type { CreatorItem } from "#/server/creators";

interface CreatorItemsProps {
	items: CreatorItem[];
}

export function CreatorItems({ items }: CreatorItemsProps) {
	const { t } = useTranslation();

	return (
		<div>
			<h2 className="text-xl font-semibold mb-4">{t("creatorDetails.items")}</h2>
			{items.length === 0 ? (
				<p className="text-muted-foreground">{t("library.empty")}</p>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
					{items.map((item) => (
						<MediaCard key={item.id} mediaItem={item} shouldShowType={true} />
					))}
				</div>
			)}
		</div>
	);
}
