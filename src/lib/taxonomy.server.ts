import { eq } from "drizzle-orm";

import { db } from "#/database/index";
import { type FilterAndSortOptions, views } from "#/database/schema";
import type { TaxonomyFilterKey } from "#/lib/taxonomy";

/**
 * The server-only half of the shared taxonomy layer — the logic every taxonomy
 * entity needs regardless of how it links to items. Per-entity CRUD stays in
 * `tags.server.ts` / `genres.server.ts`, because the table and the usage-count
 * query genuinely differ.
 *
 * It lives apart from `taxonomy.ts` because that module is imported by the
 * client: a `createServerFn` handler body is stripped from the client bundle,
 * but a plain exported function is not, so anything reaching into the database
 * has to sit here.
 */

export function requireNonEmptyName(name: string): string {
	const trimmedName = name.trim();
	if (trimmedName.length === 0) {
		throw new Error("Taxonomy name cannot be empty");
	}
	return trimmedName;
}

/**
 * A name check leaves a narrow race between two concurrent writes, so the
 * `userId, name` unique index is the real guard — callers translate its
 * violation into the conflict result they already handle.
 */
export function isDuplicateNameError(error: unknown): boolean {
	// Drizzle wraps driver errors, so the pg code can sit at any depth.
	let candidate: unknown = error;
	while (typeof candidate === "object" && candidate !== null) {
		if ("code" in candidate && candidate.code === UNIQUE_VIOLATION_ERROR_CODE) {
			return true;
		}
		candidate = (candidate as { cause?: unknown }).cause;
	}

	return false;
}

export async function renameValueInViewFilters(
	userId: string,
	filterKey: TaxonomyFilterKey,
	oldName: string,
	newName: string,
): Promise<void> {
	await rewriteViewFilterValues(userId, filterKey, (values) => {
		if (!values.includes(oldName)) {
			return values;
		}

		// A view already filtering on both names would otherwise end up with the
		// survivor listed twice.
		return Array.from(
			new Set(values.map((value) => (value === oldName ? newName : value))),
		);
	});
}

export async function removeValueFromViewFilters(
	userId: string,
	filterKey: TaxonomyFilterKey,
	name: string,
): Promise<void> {
	await rewriteViewFilterValues(userId, filterKey, (values) =>
		values.filter((value) => value !== name),
	);
}

// ---- Private helpers

const UNIQUE_VIOLATION_ERROR_CODE = "23505";

/**
 * Runs `rewrite` over the names saved under `filterKey` in each of the user's
 * view filters. Views store taxonomy names rather than ids, so a rename or
 * delete that skipped this would leave them filtering on a name that no longer
 * exists. Only the given key is touched, so renaming a genre can never disturb
 * a view's tag filter.
 */
async function rewriteViewFilterValues(
	userId: string,
	filterKey: TaxonomyFilterKey,
	rewrite: (values: string[]) => string[],
): Promise<void> {
	const savedViews = await db
		.select({ id: views.id, filters: views.filters })
		.from(views)
		.where(eq(views.userId, userId));

	for (const savedView of savedViews) {
		const values = savedView.filters[filterKey];
		if (values === undefined) {
			continue;
		}

		const rewrittenValues = rewrite(values);
		if (areValuesEqual(values, rewrittenValues)) {
			continue;
		}

		await db
			.update(views)
			.set({
				filters: buildFiltersWithValues(
					savedView.filters,
					filterKey,
					rewrittenValues,
				),
			})
			.where(eq(views.id, savedView.id));
	}
}

/**
 * An emptied list drops its key entirely rather than saving `[]`, so the view
 * stops carrying a filter that no longer narrows anything.
 */
function buildFiltersWithValues(
	filters: FilterAndSortOptions,
	filterKey: TaxonomyFilterKey,
	values: string[],
): FilterAndSortOptions {
	if (values.length === 0) {
		const { [filterKey]: _removedValues, ...remainingFilters } = filters;
		return remainingFilters;
	}

	return { ...filters, [filterKey]: values };
}

function areValuesEqual(left: string[], right: string[]): boolean {
	return (
		left.length === right.length &&
		left.every((value, index) => value === right[index])
	);
}
