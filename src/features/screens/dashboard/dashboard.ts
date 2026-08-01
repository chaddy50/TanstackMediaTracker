import { createServerFn } from "@tanstack/react-start";
import { getLoggedInUser } from "#/features/screens/auth/session";
import { fetchDashboardData } from "#/features/screens/dashboard/dashboard.server";

export const getDashboardData = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await getLoggedInUser();
		return fetchDashboardData(user.id);
	},
);

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
export type DashboardItem = DashboardData["inProgressItems"][number];
