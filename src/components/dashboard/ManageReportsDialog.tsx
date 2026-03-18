import { PencilIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { MediaItemType } from "#/server/enums";
import type {
	CustomReport,
	DashboardReportType,
	ReportMonthOption,
} from "#/server/reports/types";
import {
	createCustomReport,
	deleteCustomReport,
	updateCustomReport,
} from "@/server/reports/reportManager";
import { CreateEditReportForm } from "./CreateEditReportForm";

type FormState =
	| { mode: "none" }
	| { mode: "create" }
	| { mode: "edit"; report: CustomReport };

type Props = {
	isOpen: boolean;
	reports: CustomReport[];
	onClose: () => void;
	onReportsChanged: (reports: CustomReport[]) => void;
};

export function ManageReportsDialog({
	isOpen,
	reports,
	onClose,
	onReportsChanged,
}: Props) {
	const { t } = useTranslation();
	const [formState, setFormState] = useState<FormState>({ mode: "none" });
	const [deletingId, setDeletingId] = useState<number | null>(null);

	const reportTypeLabel: Record<DashboardReportType, string> = {
		progress_by_month: t("dashboard.report.progressByMonth"),
		items_completed_by_month: t("dashboard.report.itemsCompletedByMonth"),
		items_completed_by_genre: t("dashboard.report.itemsCompletedByGenre"),
		avg_score_by_genre: t("dashboard.report.avgScoreByGenre"),
	};

	const mediaTypeLabel: Record<MediaItemType, string> = {
		[MediaItemType.BOOK]: t("mediaType.book"),
		[MediaItemType.MOVIE]: t("mediaType.movie"),
		[MediaItemType.TV_SHOW]: t("mediaType.tv_show"),
		[MediaItemType.VIDEO_GAME]: t("mediaType.video_game"),
		[MediaItemType.PODCAST]: t("mediaType.podcast"),
	};

	function formatMediaTypes(report: CustomReport): string {
		if (!report.mediaTypes || report.mediaTypes.length === 0) {
			return t("dashboard.report.allMediaTypes");
		}
		return report.mediaTypes.map((type) => mediaTypeLabel[type]).join(", ");
	}

	async function handleSave(data: {
		name: string;
		reportType: DashboardReportType;
		mediaTypes: MediaItemType[] | null;
		monthCount: ReportMonthOption;
	}) {
		if (formState.mode === "create") {
			const created = await createCustomReport({ data });
			onReportsChanged([...reports, created]);
		} else if (formState.mode === "edit") {
			const updated = await updateCustomReport({
				data: { id: formState.report.id, ...data },
			});
			onReportsChanged(reports.map((r) => (r.id === updated.id ? updated : r)));
		}
		setFormState({ mode: "none" });
	}

	async function handleDelete(reportId: number) {
		setDeletingId(reportId);
		try {
			await deleteCustomReport({ data: { id: reportId } });
			onReportsChanged(reports.filter((r) => r.id !== reportId));
		} finally {
			setDeletingId(null);
		}
	}

	function handleOpenChange(open: boolean) {
		if (!open) {
			setFormState({ mode: "none" });
			onClose();
		}
	}

	const title =
		formState.mode === "create"
			? t("dashboard.report.newReport")
			: formState.mode === "edit"
				? t("dashboard.report.editReport")
				: t("dashboard.report.manageReports");

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>

				{formState.mode === "none" && (
					<div className="flex flex-col gap-3">
						{reports.length === 0 && (
							<p className="text-sm text-muted-foreground text-center py-4">
								{t("dashboard.report.noReports")}
							</p>
						)}
						{reports.map((report) => (
							<div
								key={report.id}
								className="flex items-start justify-between gap-2 rounded-lg border border-border p-3"
							>
								<div className="flex flex-col gap-0.5 min-w-0">
									<p className="text-sm font-medium truncate">{report.name}</p>
									<p className="text-xs text-muted-foreground">
										{reportTypeLabel[report.reportType]}
										{" · "}
										{formatMediaTypes(report)}
									</p>
								</div>
								<div className="flex items-center gap-1 shrink-0">
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={() => setFormState({ mode: "edit", report })}
									>
										<PencilIcon />
									</Button>
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={() => handleDelete(report.id)}
										disabled={deletingId === report.id}
									>
										<TrashIcon />
									</Button>
								</div>
							</div>
						))}
						<Button
							variant="outline"
							className="w-full"
							onClick={() => setFormState({ mode: "create" })}
						>
							{t("dashboard.report.newReport")}
						</Button>
					</div>
				)}

				{(formState.mode === "create" || formState.mode === "edit") && (
					<CreateEditReportForm
						initial={formState.mode === "edit" ? formState.report : undefined}
						onSave={handleSave}
						onCancel={() => setFormState({ mode: "none" })}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
