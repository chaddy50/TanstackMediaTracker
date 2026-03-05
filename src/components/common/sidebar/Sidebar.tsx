import { useQuery } from "@tanstack/react-query";
import { Layers, LayoutDashboard, Library, Plus, Settings } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "#/components/ui/button";
import { getViews } from "#/server/views";
import { CreateViewDialog } from "#/components/views/CreateViewDialog";
import { SidebarItem } from "./components/SidebarItem";

export function Sidebar() {
	const { t } = useTranslation();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	const { data: viewsList = [] } = useQuery({
		queryKey: ["views"],
		queryFn: () => getViews(),
	});

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
						{viewsList.map((view) => (
							<SidebarItem
								key={view.id}
								to="/views/$viewId"
								params={{ viewId: String(view.id) }}
							>
								{view.name}
							</SidebarItem>
						))}
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
