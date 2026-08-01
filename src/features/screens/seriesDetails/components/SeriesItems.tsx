import { useTranslation } from "react-i18next";

import { MediaItemCard } from "#/components/MediaItemCard";
import type { SeriesItem } from "#/features/screens/seriesDetails/seriesDetails";

interface SeriesItemsProps {
	items: SeriesItem[];
}

export function SeriesItems({ items }: SeriesItemsProps) {
	const { t } = useTranslation();

	return (
		<div>
			<h2 className="text-xl font-semibold mb-4">{t("seriesDetails.items")}</h2>
			{items.length === 0 ? (
				<p className="text-muted-foreground">{t("library.empty")}</p>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
					{items.map((item) => (
						<MediaItemCard key={item.id} mediaItem={item} shouldShowType={false} />
					))}
				</div>
			)}
		</div>
	);
}
