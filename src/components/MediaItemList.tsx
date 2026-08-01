import type { LibraryItem } from "#/features/screens/library/library";
import { MediaItemCard } from "./MediaItemCard";

interface MediaItemListProps {
	items: LibraryItem[];
}

export function MediaItemList({ items }: MediaItemListProps) {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
			{items.map((item) => (
				<MediaItemCard key={item.id} mediaItem={item} />
			))}
		</div>
	);
}
