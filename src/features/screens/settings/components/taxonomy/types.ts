import type { TaxonomyEntry, TaxonomyMutationResult } from "#/lib/taxonomy";

/**
 * Everything `TaxonomySection` needs to manage one taxonomy entity. The
 * operations take plain arguments rather than server-function `{ data }`
 * envelopes — wrapping is the consumer's job, which is what keeps the shared
 * panel free of any entity knowledge.
 */
export type TaxonomySectionConfig = {
	/** i18n group holding this entity's own strings, e.g. "settings.genres". */
	i18nPrefix: string;
	/** React Query key for this section's own list. */
	listQueryKey: string[];
	/** Keys to invalidate after a mutation — the entity's plain list, plus views. */
	dependentQueryKeys: string[][];
	listEntries: () => Promise<TaxonomyEntry[]>;
	createEntry: (name: string) => Promise<TaxonomyMutationResult>;
	renameEntry: (
		entryId: number,
		name: string,
	) => Promise<TaxonomyMutationResult>;
	deleteEntry: (entryId: number) => Promise<void>;
	/** Folds `sourceId` into `targetId` and deletes the source. Irreversible. */
	mergeEntries: (sourceId: number, targetId: number) => Promise<void>;
};
