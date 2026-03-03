import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { checkSession } from "#/server/auth";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async () => {
		const user = await checkSession();
		if (!user) {
			throw redirect({ to: "/login" });
		}
	},
	component: () => <Outlet />,
});
