import { and, eq, inArray, isNull, max } from "drizzle-orm";

import { db } from "#/database/index";
import { viewGroups, views } from "#/database/schema";

/**
 * The server-only half of the view group feature. It lives apart from
 * `viewGroup.ts` for the same reason `view.server.ts` does: a `createServerFn`
 * handler body is stripped from the client bundle, but a plain exported function
 * is not, so anything reaching into the database has to sit here.
 */

/**
 * The whole sidebar arrangement in one payload: `topLevel` is the interleaved
 * order of ungrouped views and groups, and `groups` carries each group's own
 * view order. Saving it wholesale is what keeps a drag from ever landing the
 * sidebar in a half-written state.
 */
export type SidebarLayout = {
	topLevel: Array<{ kind: "view" | "group"; id: number }>;
	groups: Array<{ groupId: number; viewIds: number[] }>;
};

/**
 * Replaces the user's entire sidebar arrangement.
 *
 * Every id is verified as the caller's before a single row is written: the
 * client supplies raw ids, so without that check a crafted payload could
 * re-parent or reorder somebody else's views.
 */
export async function handleSaveSidebarLayout(
	layout: SidebarLayout,
	userId: string,
): Promise<void> {
	const topLevelViewIds = collectTopLevelIds(layout, "view");
	const topLevelGroupIds = collectTopLevelIds(layout, "group");
	const groupedViewIds = layout.groups.flatMap((group) => group.viewIds);
	const orderedGroupIds = layout.groups.map((group) => group.groupId);

	// A view lives in exactly one place, so its id may appear once across the
	// whole layout. A group legitimately appears twice — once positioned in
	// `topLevel`, once carrying its views in `groups` — so those are checked
	// against each other rather than pooled.
	assertNoDuplicates([...topLevelViewIds, ...groupedViewIds], "view");
	assertNoDuplicates(topLevelGroupIds, "group");
	assertNoDuplicates(orderedGroupIds, "group");

	const unplacedGroupId = orderedGroupIds.find(
		(groupId) => !topLevelGroupIds.includes(groupId),
	);
	if (unplacedGroupId !== undefined) {
		throw new Error(
			`Sidebar layout ordered group ${unplacedGroupId} without placing it`,
		);
	}

	await assertOwnsAll(
		[...topLevelViewIds, ...groupedViewIds],
		topLevelGroupIds,
		userId,
	);

	await db.transaction(async (tx) => {
		for (const [position, entry] of layout.topLevel.entries()) {
			if (entry.kind === "group") {
				await tx
					.update(viewGroups)
					.set({ displayOrder: position })
					.where(
						and(eq(viewGroups.id, entry.id), eq(viewGroups.userId, userId)),
					);
				continue;
			}

			await tx
				.update(views)
				.set({ displayOrder: position, groupId: null })
				.where(and(eq(views.id, entry.id), eq(views.userId, userId)));
		}

		for (const group of layout.groups) {
			for (const [position, viewId] of group.viewIds.entries()) {
				await tx
					.update(views)
					.set({ displayOrder: position, groupId: group.groupId })
					.where(and(eq(views.id, viewId), eq(views.userId, userId)));
			}
		}
	});
}

/**
 * Deletes a group and returns its views to the top level. The views themselves
 * always survive — the group is an organizational wrapper, not an owner.
 */
export async function handleDeleteViewGroup(
	groupId: number,
	userId: string,
): Promise<void> {
	await findOwnedViewGroup(groupId, userId);

	await db.transaction(async (tx) => {
		// The column is `on delete set null` already, but clearing it explicitly
		// keeps this path scoped by user rather than trusting the cascade.
		await tx
			.update(views)
			.set({ groupId: null })
			.where(and(eq(views.groupId, groupId), eq(views.userId, userId)));

		await tx
			.delete(viewGroups)
			.where(and(eq(viewGroups.id, groupId), eq(viewGroups.userId, userId)));
	});
}

/** Loads a group, or throws if it does not exist or belongs to someone else. */
export async function findOwnedViewGroup(groupId: number, userId: string) {
	const [group] = await db
		.select()
		.from(viewGroups)
		.where(and(eq(viewGroups.id, groupId), eq(viewGroups.userId, userId)));

	if (!group) {
		throw new Error(`View group ${groupId} not found`);
	}

	return group;
}

/**
 * The position a newly created group takes: one past everything already sitting
 * at the top level. Groups and ungrouped views share that ordering space, so
 * both have to be consulted.
 */
export async function findNextTopLevelDisplayOrder(
	userId: string,
): Promise<number> {
	const [ungroupedViews] = await db
		.select({ highest: max(views.displayOrder) })
		.from(views)
		.where(and(eq(views.userId, userId), isNull(views.groupId)));

	const [existingGroups] = await db
		.select({ highest: max(viewGroups.displayOrder) })
		.from(viewGroups)
		.where(eq(viewGroups.userId, userId));

	const highest = Math.max(
		ungroupedViews?.highest ?? -1,
		existingGroups?.highest ?? -1,
	);
	return highest + 1;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function collectTopLevelIds(
	layout: SidebarLayout,
	kind: "view" | "group",
): number[] {
	return layout.topLevel
		.filter((entry) => entry.kind === kind)
		.map((entry) => entry.id);
}

function assertNoDuplicates(ids: number[], kind: "view" | "group"): void {
	if (new Set(ids).size === ids.length) {
		return;
	}

	throw new Error(`Sidebar layout listed the same ${kind} more than once`);
}

/**
 * Refuses the whole layout unless every id in it is the caller's. Anything
 * missing is either someone else's or nonexistent; neither is worth
 * distinguishing to the client.
 */
async function assertOwnsAll(
	viewIds: number[],
	groupIds: number[],
	userId: string,
): Promise<void> {
	const uniqueViewIds = [...new Set(viewIds)];
	const uniqueGroupIds = [...new Set(groupIds)];

	if (uniqueViewIds.length > 0) {
		const ownedViews = await db
			.select({ id: views.id })
			.from(views)
			.where(and(eq(views.userId, userId), inArray(views.id, uniqueViewIds)));

		if (ownedViews.length !== uniqueViewIds.length) {
			throw new Error("Sidebar layout referenced views outside the user's own");
		}
	}

	if (uniqueGroupIds.length === 0) {
		return;
	}

	const ownedGroups = await db
		.select({ id: viewGroups.id })
		.from(viewGroups)
		.where(
			and(
				eq(viewGroups.userId, userId),
				inArray(viewGroups.id, uniqueGroupIds),
			),
		);

	if (ownedGroups.length !== uniqueGroupIds.length) {
		throw new Error(
			"Sidebar layout referenced view groups outside the user's own",
		);
	}
}
