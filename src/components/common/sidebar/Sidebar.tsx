import { useQuery } from "@tanstack/react-query";
import {
	LayoutDashboard,
	Library,
	PanelLeftClose,
	PanelLeftOpen,
	Plus,
} from "lucide-react";
import { createContext, useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/ui/button";
import { CreateViewDialog } from "#/components/views/CreateViewDialog";
import { getViews } from "#/server/views";
import { SidebarItem } from "./components/SidebarItem";

// ── Context ───────────────────────────────────────────────────────────────────

interface SidebarContextValue {
	isOpen: boolean;
	toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
	isOpen: true,
	toggle: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
	const [isOpen, setIsOpen] = useState(() => {
		if (typeof window === "undefined") return true;
		return localStorage.getItem("sidebar-open") !== "false";
	});

	function toggle() {
		setIsOpen((previous) => {
			const next = !previous;
			localStorage.setItem("sidebar-open", String(next));
			return next;
		});
	}

	return (
		<SidebarContext.Provider value={{ isOpen, toggle }}>
			{children}
		</SidebarContext.Provider>
	);
}

export function useSidebar() {
	return useContext(SidebarContext);
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function Sidebar() {
	const { t } = useTranslation();
	const { isOpen, toggle } = useSidebar();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	const { data: viewsList = [] } = useQuery({
		queryKey: ["views"],
		queryFn: () => getViews(),
	});

	return (
		<>
			<aside
				className={`transition-[width] duration-200 ease-in-out shrink-0 border-r border-border bg-card flex flex-col ${
					isOpen ? "w-56" : "w-12"
				}`}
			>
				{/* Toggle button */}
				<div
					className={`flex items-center p-2 ${isOpen ? "justify-end" : "justify-center"}`}
				>
					<Button variant="ghost" size="icon" onClick={toggle}>
						{isOpen ? (
							<PanelLeftClose className="size-4" />
						) : (
							<PanelLeftOpen className="size-4" />
						)}
						<span className="sr-only">
							{isOpen ? t("nav.collapseSidebar") : t("nav.expandSidebar")}
						</span>
					</Button>
				</div>

				{/* Nav content — hidden when collapsed */}
				<div
					className={`flex-1 flex flex-col overflow-hidden transition-opacity duration-150 ${
						isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
					}`}
				>
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
					</nav>

					{viewsList.length > 0 && (
						<>
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
							</nav>
						</>
					)}

					<div className="mt-auto px-2 pb-4">
						<Button
							variant="ghost"
							size="sm"
							className="w-full justify-start gap-2"
							onClick={() => setIsCreateDialogOpen(true)}
						>
							<Plus className="size-4 shrink-0" />
							{t("views.newView")}
						</Button>
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
