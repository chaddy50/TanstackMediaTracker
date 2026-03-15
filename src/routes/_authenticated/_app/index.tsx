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
	const [
		{ inProgressItems, nextInSeriesItems, recentlyFinishedItems },
		initialReport,
	] = Route.useLoaderData();
	const { t } = useTranslation();

	return (
		<div className="flex flex-col bg-background text-foreground">
			<PageHeader title={t("dashboard.title")} />
			<main className="px-4 md:px-6 py-2 flex-1 min-h-0 flex flex-col gap-2">
				<div className="flex flex-col md:flex-row gap-4 md:gap-10 shrink-0">
					<div className="flex-1 min-w-0">
						<DashboardSection
							variant="scroll"
							cardWidth="w-38"
							title={t("dashboard.inProgress")}
							items={inProgressItems}
							emptyMessage={t("dashboard.emptyInProgress")}
						/>
					</div>
					<div className="shrink-0 md:w-120">
						<DashboardReport initialReport={initialReport} />
					</div>
				</div>
				<div className="shrink-0">
					<DashboardSection
						variant="scroll"
						cardWidth="w-30"
						title={t("dashboard.nextInSeries")}
						items={nextInSeriesItems}
						emptyMessage={t("dashboard.emptyNextInSeries")}
					/>
				</div>
				<div className="shrink-0">
					<DashboardSection
						variant="scroll"
						cardWidth="w-30"
						title={t("dashboard.recentlyFinished")}
						items={recentlyFinishedItems}
						emptyMessage={t("dashboard.emptyRecentlyFinished")}
					/>
				</div>
			</main>
		</div>
	);
}
