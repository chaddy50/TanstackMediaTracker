import { runCreatorsBackfill } from "#/server/creatorsInternal";

export async function runCreatorsBackfillJob(
	userId: string,
): Promise<{ processedCount: number }> {
	return runCreatorsBackfill(userId);
}
