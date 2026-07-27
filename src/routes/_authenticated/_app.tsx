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
			<div className="flex-1 overflow-y-auto pb-16 md:pb-0">
				<Outlet />
			</div>
			<BottomNavBar />
		</div>
	);
}
