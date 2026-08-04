import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";

import { MediaItemCard } from "#/components/MediaItemCard";
import type { ItemQueryItem } from "#/lib/queries/types";

interface ReorderableItemCardProps {
	item: ItemQueryItem;
	shouldShowPurchaseStatus?: boolean;
	shouldShowStatus?: boolean;
}

/**
 * A library card made draggable.
 *
 * The card itself is the shared `MediaItemCard`, so reorder mode looks exactly
 * like the grid it replaces; this only adds the drag affordances around it and
 * turns off the card's link, since a stray click mid-drag must not navigate.
 */
export function ReorderableItemCard({
	item,
	shouldShowPurchaseStatus,
	shouldShowStatus,
}: ReorderableItemCardProps) {
	const { t } = useTranslation();
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: item.id });

	return (
		<div
			ref={setNodeRef}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
				opacity: isDragging ? 0.4 : 1,
			}}
			className="relative self-start touch-none cursor-grab active:cursor-grabbing"
			{...attributes}
			{...listeners}
		>
			<MediaItemCard
				mediaItem={item}
				shouldLinkToDetails={false}
				shouldShowPurchaseStatus={shouldShowPurchaseStatus}
				shouldShowStatus={shouldShowStatus}
			/>

			{/* Decoration only — the whole card is the drag handle. */}
			<div className="absolute top-1.5 right-1.5 rounded bg-black/60 text-white backdrop-blur-sm p-1 pointer-events-none">
				<GripVertical className="size-4" />
				<span className="sr-only">{t("views.dragToReorder")}</span>
			</div>
		</div>
	);
}
