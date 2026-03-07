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
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, LayoutDashboard, Library, Plus, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "#/components/ui/button";
import { CreateViewDialog } from "#/components/views/CreateViewDialog";
import { getViews, reorderViews, type View } from "#/server/views";
import { DragOverlayViewItem } from "./components/DragOverlayViewItem";
import { SidebarItem } from "./components/SidebarItem";
import { SortableViewItem } from "./components/SortableViewItem";

export function Sidebar() {
	const { t } = useTranslation();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [orderedViews, setOrderedViews] = useState<View[]>([]);
	const [activeId, setActiveId] = useState<number | null>(null);
	const queryClient = useQueryClient();

	const { data: viewsList = [] } = useQuery({
		queryKey: ["views"],
		queryFn: () => getViews(),
	});

	useEffect(() => {
		setOrderedViews(viewsList);
	}, [viewsList]);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 5 },
		}),
	);

	const activeView =
		activeId !== null
			? orderedViews.find((view) => view.id === activeId)
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

		const oldIndex = orderedViews.findIndex((view) => view.id === active.id);
		const newIndex = orderedViews.findIndex((view) => view.id === over.id);
		const reordered = arrayMove(orderedViews, oldIndex, newIndex);

		setOrderedViews(reordered);

		void reorderViews({
			data: { orderedIds: reordered.map((view) => view.id) },
		}).then(() => {
			void queryClient.invalidateQueries({ queryKey: ["views"] });
		});
	}

	return (
		<>
			<aside className="w-56 border-r border-border shrink-0 bg-card flex flex-col">
				<div className="flex-1 flex flex-col overflow-hidden pt-4">
					<nav className="flex flex-col gap-0.5 px-2">
						<SidebarItem
							to="/"
							icon={<LayoutDashboard className="size-4 shrink-0" />}
							activeOptions={{ exact: true }}
						>
							{t("nav.dashboard")}
						</SidebarItem>
						<SidebarItem
							to="/library"
							icon={<Library className="size-4 shrink-0" />}
						>
							{t("nav.library")}
						</SidebarItem>
						<SidebarItem
							to="/series"
							icon={<Layers className="size-4 shrink-0" />}
						>
							{t("nav.series")}
						</SidebarItem>
					</nav>

					<p className="px-4 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						{t("nav.views")}
					</p>
					<nav className="flex flex-col gap-0.5 px-2">
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragStart={handleDragStart}
							onDragEnd={handleDragEnd}
						>
							<SortableContext
								items={orderedViews.map((view) => view.id)}
								strategy={verticalListSortingStrategy}
							>
								{orderedViews.map((view) => (
									<SortableViewItem key={view.id} view={view} />
								))}
							</SortableContext>
							<DragOverlay>
								{activeView ? <DragOverlayViewItem view={activeView} /> : null}
							</DragOverlay>
						</DndContext>
						<Button
							variant="ghost"
							size="sm"
							className="w-full justify-start gap-2"
							onClick={() => setIsCreateDialogOpen(true)}
						>
							<Plus className="size-4 shrink-0" />
							{t("views.newView")}
						</Button>
					</nav>

					<div className="mt-auto px-2 pb-2">
						<SidebarItem
							to="/settings"
							icon={<Settings className="size-4 shrink-0" />}
						>
							{t("nav.settings")}
						</SidebarItem>
					</div>
				</div>
			</aside>

			<CreateViewDialog
				isOpen={isCreateDialogOpen}
				onClose={() => setIsCreateDialogOpen(false)}
			/>
		</>
	);
}
