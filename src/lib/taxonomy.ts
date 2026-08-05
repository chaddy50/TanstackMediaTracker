/**
 * A taxonomy is a user-owned, uniquely-named lookup row that items reference and
 * that the user manages from Settings — currently tags and genres. The two differ
 * only in how they link to items, so everything the UI touches is shared.
 */

/** The flat shape the shared settings UI renders, whatever the backing table. */
export type TaxonomyEntry = { id: number; name: string; itemCount: number };

/** Create and rename both fail the same way, on a duplicate name. */
export type TaxonomyMutationResult = { status: "ok" } | { status: "conflict" };

/** The saved-view filter keys that hold taxonomy names rather than ids. */
export type TaxonomyFilterKey = "tags" | "genres";
