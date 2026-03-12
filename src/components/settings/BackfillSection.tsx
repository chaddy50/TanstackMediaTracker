import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { BACKFILL_JOBS } from "#/lib/backfillJobs";
import { runBackfillJob } from "#/server/backfill";
import { Button } from "../ui/button";

export function BackfillSection() {
	const { t } = useTranslation();

	return (
		<section className="flex flex-col gap-4">
			<div>
				<h2 className="text-lg font-semibold">
					{t("settings.backfill.title")}
				</h2>
				<p className="text-sm text-muted-foreground">
					{t("settings.backfill.description")}
				</p>
			</div>

			<div className="flex flex-col gap-6">
				{BACKFILL_JOBS.map((job) => (
					<BackfillJobRow key={job.name} jobName={job.name} />
				))}
			</div>
		</section>
	);
}

function BackfillJobRow({ jobName }: { jobName: string }) {
	const { t } = useTranslation();
	const [isRunning, setIsRunning] = useState(false);
	const [result, setResult] = useState<{ processedCount: number; remaining?: number } | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function handleRun() {
		setIsRunning(true);
		setResult(null);
		setError(null);
		try {
			const jobResult = await runBackfillJob({ data: { jobName } });
			setResult(jobResult);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsRunning(false);
		}
	}

	return (
		<div className="flex flex-col gap-2">
			<div>
				<p className="font-medium">
					{t(`backfill.${jobName}.label` as never)}
				</p>
				<p className="text-sm text-muted-foreground">
					{t(`backfill.${jobName}.description` as never)}
				</p>
			</div>
			<div className="flex items-center gap-4">
				<Button
					variant="outline"
					onClick={handleRun}
					disabled={isRunning}
					className="gap-2"
				>
					<RefreshCw className="size-4" />
					{isRunning ? t("backfill.running") : t("backfill.runButton")}
				</Button>
				{result && (
					<span className="text-sm text-muted-foreground">
						{t("backfill.result", { count: result.processedCount })}
						{result.remaining != null && result.remaining > 0 && (
							<>
								{" · "}
								{t("backfill.remaining", { count: result.remaining })}
							</>
						)}
					</span>
				)}
				{error && (
					<span className="text-sm text-destructive">{error}</span>
				)}
			</div>
		</div>
	);
}
