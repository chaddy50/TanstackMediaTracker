import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PageHeader } from "#/components/common/PageHeader";
import { DashboardSection } from "#/components/dashboard/DashboardSection";
import { getDashboardData } from "#/server/dashboard";

export const Route = createFileRoute("/_authenticated/_app/")({
	loader: () => getDashboardData(),
	component: DashboardPage,
});

function DashboardPage() {
	const { inProgressItems, nextInSeriesItems, recentlyFinishedItems } =
		Route.useLoaderData();
	const { t } = useTranslation();

	return (
		<div className="min-h-screen bg-background text-foreground">
			<PageHeader title={t("dashboard.title")} />
			<main className="px-4 md:px-6 py-4 flex flex-col gap-6 md:flex-row md:flex-wrap md:gap-x-24 md:gap-y-6 items-start">
				<div className="w-full">
					<DashboardSection
						title={t("dashboard.inProgress")}
						items={inProgressItems}
						emptyMessage={t("dashboard.emptyInProgress")}
					/>
				</div>
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
	)
}
