import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";
import { getViews } from "#/server/views";
import { CreateViewDialog } from "@/components/dataViews/CreateViewDialog";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
	LayoutDashboard,
	Library,
	LogOut,
	PanelLeftClose,
	Plus,
} from "lucide-react";
import { createContext, useContext, useState } from "react";
import { useTranslation } from "react-i18next";
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
	const router = useRouter();

	const { data: viewsList = [] } = useQuery({
		queryKey: ["views"],
		queryFn: () => getViews(),
	});

	async function handleLogout() {
		await authClient.signOut();
		router.navigate({ to: "/login" });
	}

	return (
		<>
			<aside
				className={`transition-[width] duration-200 ease-in-out shrink-0 bg-card flex flex-col overflow-hidden ${
					isOpen ? "w-56 border-r border-border" : "w-0"
				}`}
			>
				{/* Toggle button — only visible when open */}
				<div className="flex items-center justify-end p-2">
					<Button variant="ghost" size="icon" onClick={toggle}>
						<PanelLeftClose className="size-4" />
						<span className="sr-only">{t("nav.collapseSidebar")}</span>
					</Button>
				</div>

				{/* Nav content */}
				<div className="flex-1 flex flex-col overflow-hidden">
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

					<div className="mt-auto px-2 pb-2">
						<Button
							variant="ghost"
							size="sm"
							className="w-full justify-start gap-2"
							onClick={() => setIsCreateDialogOpen(true)}
						>
							<Plus className="size-4 shrink-0" />
							{t("views.newView")}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="w-full justify-start gap-2"
							onClick={handleLogout}
						>
							<LogOut className="size-4 shrink-0" />
							{t("auth.logout")}
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
