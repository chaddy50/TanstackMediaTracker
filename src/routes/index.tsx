import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { AddMediaButton } from "#/components/common/AddMediaButton";
import { PageHeader } from "#/components/common/PageHeader";
import { DashboardSection } from "#/components/dashboard/DashboardSection";
import { Button } from "#/components/ui/button";
import { getDashboardData } from "#/server/dashboard";

export const Route = createFileRoute("/")({
	loader: () => getDashboardData(),
	component: DashboardPage,
});

function DashboardPage() {
	const { inProgressItems, nextInSeriesItems, recentlyFinishedItems } =
		Route.useLoaderData();
	const { t } = useTranslation();

	return (
		<div className="min-h-screen bg-background text-foreground">
			<PageHeader
				title={t("dashboard.title")}
				right={
					<div className="flex items-center gap-2">
						<Link to="/library">
							<Button variant="outline">{t("dashboard.libraryLink")}</Button>
						</Link>
						<AddMediaButton />
					</div>
				}
			/>
			<main className="px-6 py-4 flex flex-col gap-6">
				<div className="flex flex-wrap gap-x-24 gap-y-6 items-start">
					<DashboardSection
						title={t("dashboard.inProgress")}
						items={inProgressItems}
						emptyMessage={t("dashboard.emptyInProgress")}
					/>
					<DashboardSection
						title={t("dashboard.nextInSeries")}
						items={nextInSeriesItems}
						emptyMessage={t("dashboard.emptyNextInSeries")}
					/>
				</div>
				<DashboardSection
					title={t("dashboard.recentlyFinished")}
					items={recentlyFinishedItems}
					emptyMessage={t("dashboard.emptyRecentlyFinished")}
				/>
			</main>
		</div>
	);
}
