import { useTranslation } from "react-i18next";

import { MediaItemCard } from "#/components/MediaItemCard";
import type { GenreItem } from "#/lib/genres/genres";

interface GenreItemsProps {
	items: GenreItem[];
}

export function GenreItems({ items }: GenreItemsProps) {
	const { t } = useTranslation();

	return (
		<div>
			<h2 className="text-xl font-semibold mb-4">{t("genreDetails.items")}</h2>
			{items.length === 0 ? (
				<p className="text-muted-foreground">{t("library.empty")}</p>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
					{items.map((item) => (
						<MediaItemCard
							key={item.id}
							mediaItem={item}
							shouldShowType={true}
						/>
					))}
				</div>
			)}
		</div>
	);
}
