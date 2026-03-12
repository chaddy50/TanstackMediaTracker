import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getLoggedInUser } from "#/lib/session";

/**
 * Generic backfill server function.
 *
 * Dispatches to the appropriate job implementation based on jobName.
 * Job implementations are dynamically imported inside the handler body so
 * they are stripped from the client bundle by TanStack Start's transform.
 *
 * To add a new backfill job:
 *   1. Create src/server/backfillJobs/<jobName>.ts with a run<JobName>Backfill export
 *   2. Add a dispatch branch below
 *   3. Add { name: "<jobName>" } to BACKFILL_JOBS in src/lib/backfillJobs.ts
 *   4. Add backfill.<jobName>.label and backfill.<jobName>.description to en.ts
 */
export const runBackfillJob = createServerFn({ method: "POST" })
	.inputValidator(z.object({ jobName: z.string() }))
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();

		if (data.jobName === "timeToComplete") {
			const { runTimeToCompleteBackfill } = await import(
				"#/server/backfillJobs/timeToComplete"
			);
			return runTimeToCompleteBackfill(user.id);
		}

		if (data.jobName === "renameEmotionalImpact") {
			const { runRenameEmotionalImpactBackfill } = await import(
				"#/server/backfillJobs/renameEmotionalImpact"
			);
			return runRenameEmotionalImpactBackfill(user.id);
		}

		if (data.jobName === "seriesRatings") {
			const { runSeriesRatingsBackfill } = await import(
				"#/server/backfillJobs/seriesRatings"
			);
			return runSeriesRatingsBackfill(user.id);
		}

		if (data.jobName === "nextItemStatus") {
			const { runNextItemStatusBackfill } = await import(
				"#/server/backfillJobs/nextItemStatus"
			);
			return runNextItemStatusBackfill(user.id);
		}

		if (data.jobName === "creators") {
		const { runCreatorsBackfillJob } = await import(
			"#/server/backfillJobs/creators"
		);
		return runCreatorsBackfillJob(user.id);
	}

	throw new Error(`Unknown backfill job: ${data.jobName}`);
	});
