import { Outlet, createFileRoute } from "@tanstack/react-router";

import { Sidebar } from "#/components/common/sidebar/Sidebar";

export const Route = createFileRoute("/_authenticated/_app")({
	component: AppLayout,
});

function AppLayout() {
	return (
		<div className="flex h-screen overflow-hidden bg-background text-foreground">
			<Sidebar />
			<div className="flex-1 overflow-y-auto">
				<Outlet />
			</div>
		</div>
	);
}
