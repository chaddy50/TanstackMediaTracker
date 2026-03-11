import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PageHeader } from "#/components/common/PageHeader";
import { DashboardReport } from "#/components/dashboard/DashboardReport";
import { DashboardSection } from "#/components/dashboard/DashboardSection";
import { getDashboardData } from "#/server/dashboard";
import { getDashboardReport } from "#/server/reports";

export const Route = createFileRoute("/_authenticated/_app/")({
	loader: () => Promise.all([getDashboardData(), getDashboardReport()]),
	component: DashboardPage,
});

function DashboardPage() {
	const [{ inProgressItems, nextInSeriesItems, recentlyFinishedItems }, initialReport] =
		Route.useLoaderData();
	const { t } = useTranslation();

	return (
		<div className="min-h-screen bg-background text-foreground">
			<PageHeader title={t("dashboard.title")} />
			<main className="px-4 md:px-6 py-4 flex flex-col gap-8">
				<DashboardReport initialReport={initialReport} />
				<DashboardSection
					title={t("dashboard.inProgress")}
					items={inProgressItems}
					emptyMessage={t("dashboard.emptyInProgress")}
				/>
				<DashboardSection
					title={t("dashboard.recentlyFinished")}
					items={recentlyFinishedItems}
					emptyMessage={t("dashboard.emptyRecentlyFinished")}
				/>
				<DashboardSection
					title={t("dashboard.nextInSeries")}
					items={nextInSeriesItems}
					emptyMessage={t("dashboard.emptyNextInSeries")}
				/>
			</main>
		</div>
	);
}
