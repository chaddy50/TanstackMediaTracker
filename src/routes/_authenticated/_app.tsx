import { createFileRoute, Outlet } from "@tanstack/react-router";

import { BottomNavBar } from "#/features/navigation/bottomNavBar/BottomNavBar";
import { Sidebar } from "#/features/navigation/sidebar/Sidebar";

export const Route = createFileRoute("/_authenticated/_app")({
	component: AppLayout,
});

function AppLayout() {
	return (
		<div className="flex h-screen overflow-hidden bg-background text-foreground">
			<Sidebar />
			{/* The app never scrolls `window`, so the router's scroll restoration has to
			    be told which element to track. Without this id it falls back to a
			    positional CSS selector that silently breaks if anything is inserted
			    ahead of this div. */}
			<div
				data-scroll-restoration-id="app-content"
				className="flex-1 overflow-y-auto pb-16 md:pb-0"
			>
				<Outlet />
			</div>
			<BottomNavBar />
		</div>
	);
}
