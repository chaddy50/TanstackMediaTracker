import { useTranslation } from "react-i18next";

import { MediaCard } from "#/components/common/MediaCard";
import type { GenreItem } from "#/server/genres/genres";

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
						<MediaCard key={item.id} mediaItem={item} shouldShowType={true} />
					))}
				</div>
			)}
		</div>
	);
}
