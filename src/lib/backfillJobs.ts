/**
 * Client-safe registry of backfill job names.
 *
 * Add a new entry here and a corresponding dispatcher branch in
 * src/server/backfill.ts to register a new backfill job.
 *
 * Translation keys follow the convention:
 *   backfill.<name>.label
 *   backfill.<name>.description
 */
export type BackfillJobInfo = {
	name: string;
};

export const BACKFILL_JOBS: BackfillJobInfo[] = [
	{ name: "timeToComplete" },
];
