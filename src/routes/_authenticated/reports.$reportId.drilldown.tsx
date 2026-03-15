import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useTranslation } from "react-i18next";

import { PageHeader } from "#/components/common/PageHeader";
import { MediaCard } from "#/components/common/MediaCard";
import { getDrillDownItems } from "#/server/reports";

const searchSchema = z.object({
	key: z.string(),
});

export const Route = createFileRoute("/_authenticated/reports/$reportId/drilldown")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }: { search: { key: string } }) => ({ key: search.key }),
	loader: ({ params, deps }) =>
		getDrillDownItems({
			data: { reportId: parseInt(params.reportId, 10), key: deps.key },
		}),
	component: DrillDownPage,
});

function DrillDownPage() {
	const items = Route.useLoaderData();
	const { key } = Route.useSearch();
	const { t } = useTranslation();

	function formatKey(rawKey: string): string {
		// If it looks like "YYYY-MM", format as "Jan 2025"
		const monthPattern = /^(\d{4})-(\d{2})$/;
		const match = monthPattern.exec(rawKey);
		if (match) {
			const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
			return date.toLocaleString("default", { month: "long", year: "numeric" });
		}
		return rawKey;
	}

	return (
		<div className="min-h-screen bg-background text-foreground">
			<PageHeader shouldShowBackButton title={formatKey(key)} />
			<div className="px-4 md:px-6 py-6 max-w-5xl mx-auto">
				{items.length === 0 ? (
					<p className="text-sm text-muted-foreground text-center py-8">
						{t("dashboard.report.noItems")}
					</p>
				) : (
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
						{items.map((item) => (
							<MediaCard key={item.id} mediaItem={item} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
