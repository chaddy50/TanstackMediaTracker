import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	rectSortingStrategy,
	SortableContext,
} from "@dnd-kit/sortable";
import { useEffect, useState } from "react";

import type { ItemQueryItem } from "#/lib/queries/types";
import { ReorderableItemCard } from "./ReorderableItemCard";

interface ReorderableItemGridProps {
	items: ItemQueryItem[];
	/** Reports the new order after each drop. The caller owns persisting it. */
	onReorder: (orderedMediaItemIds: number[]) => void;
	shouldShowPurchaseStatus?: boolean;
	shouldShowStatus?: boolean;
}

export function ReorderableItemGrid({
	items,
	onReorder,
	shouldShowPurchaseStatus,
	shouldShowStatus,
}: ReorderableItemGridProps) {
	const [orderedItems, setOrderedItems] = useState<ItemQueryItem[]>(items);
	const [activeId, setActiveId] = useState<number | null>(null);

	useEffect(() => {
		setOrderedItems(items);
	}, [items]);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 5 },
		}),
	);

	const activeItem =
		activeId !== null
			? orderedItems.find((item) => item.id === activeId)
			: null;

	function handleDragStart(event: DragStartEvent) {
		setActiveId(event.active.id as number);
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		setActiveId(null);

		if (!over || active.id === over.id) {
			return;
		}

		const oldIndex = orderedItems.findIndex((item) => item.id === active.id);
		const newIndex = orderedItems.findIndex((item) => item.id === over.id);
		const reordered = arrayMove(orderedItems, oldIndex, newIndex);

		setOrderedItems(reordered);
		onReorder(reordered.map((item) => item.id));
	}

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<SortableContext
				items={orderedItems.map((item) => item.id)}
				strategy={rectSortingStrategy}
			>
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
					{orderedItems.map((item) => (
						<ReorderableItemCard
							key={item.id}
							item={item}
							shouldShowPurchaseStatus={shouldShowPurchaseStatus}
							shouldShowStatus={shouldShowStatus}
						/>
					))}
				</div>
			</SortableContext>

			<DragOverlay dropAnimation={null}>
				{activeItem ? (
					<ReorderableItemCard
						item={activeItem}
						shouldShowPurchaseStatus={shouldShowPurchaseStatus}
						shouldShowStatus={shouldShowStatus}
					/>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}
