import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { checkSession } from "#/server/auth";
import { Sidebar, SidebarProvider } from "#/components/common/sidebar/Sidebar";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async () => {
		const user = await checkSession();
		if (!user) {
			throw redirect({ to: "/login" });
		}
	},
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	return (
		<SidebarProvider>
			<div className="flex h-screen overflow-hidden bg-background text-foreground">
				<Sidebar />
				<div className="flex-1 overflow-y-auto">
					<Outlet />
				</div>
			</div>
		</SidebarProvider>
	);
}
