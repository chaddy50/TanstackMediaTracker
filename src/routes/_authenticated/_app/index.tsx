import { createFileRoute } from "@tanstack/react-router";
import { DashboardScreen } from "#/features/screens/dashboard/DashboardScreen";
import { getDashboardData } from "#/features/screens/dashboard/dashboard";
import { getDashboardReport } from "#/features/screens/reports/reports";

export const Route = createFileRoute("/_authenticated/_app/")({
	loader: () => Promise.all([getDashboardData(), getDashboardReport()]),
	component: DashboardScreen,
});
