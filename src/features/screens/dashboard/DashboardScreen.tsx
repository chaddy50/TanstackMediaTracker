import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { TopBar } from "#/features/navigation/topBar/TopBar";
import { DashboardReport } from "./components/DashboardReport";
import { DashboardSection } from "./components/DashboardSection";

const route = getRouteApi("/_authenticated/_app/");

export function DashboardScreen() {
	const [
		{ inProgressItems, nextInSeriesItems, recentlyFinishedItems },
		initialReport,
	] = route.useLoaderData();
	const { t } = useTranslation();

	return (
		<div className="md:h-dvh md:overflow-hidden flex flex-col bg-background text-foreground">
			<TopBar title={t("dashboard.title")} />
			<main className="px-4 md:px-6 py-2 flex-1 min-h-0 flex flex-col gap-2">
				<div className="flex flex-col md:flex-row gap-4 md:gap-10 shrink-0 md:flex-1 md:min-h-0">
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
						shouldShowRating={false}
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
