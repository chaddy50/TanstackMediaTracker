import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getLoggedInUser } from "#/features/screens/auth/session";

/**
 * Generic backfill server function.
 *
 * Dispatches to the appropriate job implementation based on jobName.
 * Job implementations are dynamically imported inside the handler body so
 * they are stripped from the client bundle by TanStack Start's transform.
 *
 * To add a new backfill job:
 *   1. Create jobs/<jobName>.ts with a run<JobName>Backfill export
 *   2. Add a dispatch branch below
 *   3. Add { name: "<jobName>" } to BACKFILL_JOBS in ./backfillJobs.ts
 *   4. Add backfill.<jobName>.label and backfill.<jobName>.description to en.ts
 */
export const runBackfillJob = createServerFn({ method: "POST" })
	.inputValidator(z.object({ jobName: z.string() }))
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();

		if (data.jobName === "timeToComplete") {
			const { runTimeToCompleteBackfill } = await import(
				"#/features/screens/settings/backfill/jobs/timeToComplete"
			);
			return runTimeToCompleteBackfill(user.id);
		}

		if (data.jobName === "renameEmotionalImpact") {
			const { runRenameEmotionalImpactBackfill } = await import(
				"#/features/screens/settings/backfill/jobs/renameEmotionalImpact"
			);
			return runRenameEmotionalImpactBackfill(user.id);
		}

		if (data.jobName === "seriesRatings") {
			const { runSeriesRatingsBackfill } = await import(
				"#/features/screens/settings/backfill/jobs/seriesRatings"
			);
			return runSeriesRatingsBackfill(user.id);
		}

		if (data.jobName === "nextItemStatus") {
			const { runNextItemStatusBackfill } = await import(
				"#/features/screens/settings/backfill/jobs/nextItemStatus"
			);
			return runNextItemStatusBackfill(user.id);
		}

		if (data.jobName === "creators") {
			const { runCreatorsBackfillJob } = await import(
				"#/features/screens/settings/backfill/jobs/creators"
			);
			return runCreatorsBackfillJob(user.id);
		}

		if (data.jobName === "genres") {
			const { runGenresBackfill } = await import(
				"#/features/screens/settings/backfill/jobs/genres"
			);
			return runGenresBackfill(user.id);
		}

		throw new Error(`Unknown backfill job: ${data.jobName}`);
	});
