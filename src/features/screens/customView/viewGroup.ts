import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/database/index";
import { viewGroups } from "#/database/schema";
import { getLoggedInUser } from "#/features/screens/auth/session";
import {
	findNextTopLevelDisplayOrder,
	handleDeleteViewGroup,
	handleSaveSidebarLayout,
} from "#/features/screens/customView/viewGroup.server";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const sidebarLayoutSchema = z.object({
	topLevel: z.array(
		z.object({ kind: z.enum(["view", "group"]), id: z.number().int() }),
	),
	groups: z.array(
		z.object({
			groupId: z.number().int(),
			viewIds: z.array(z.number().int()),
		}),
	),
});

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export const getViewGroups = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await getLoggedInUser();
		return db
			.select()
			.from(viewGroups)
			.where(eq(viewGroups.userId, user.id))
			.orderBy(asc(viewGroups.displayOrder), asc(viewGroups.id));
	},
);

export type ViewGroup = Awaited<ReturnType<typeof getViewGroups>>[number];

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export const createViewGroup = createServerFn({ method: "POST" })
	.inputValidator(z.object({ name: z.string().min(1) }))
	.handler(async ({ data: { name } }) => {
		const user = await getLoggedInUser();
		const [created] = await db
			.insert(viewGroups)
			.values({
				userId: user.id,
				name,
				displayOrder: await findNextTopLevelDisplayOrder(user.id),
			})
			.returning();
		return created;
	});

export const renameViewGroup = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.number(), name: z.string().min(1) }))
	.handler(async ({ data: { id, name } }) => {
		const user = await getLoggedInUser();
		await db
			.update(viewGroups)
			.set({ name })
			.where(and(eq(viewGroups.id, id), eq(viewGroups.userId, user.id)));
	});

export const deleteViewGroup = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.number() }))
	.handler(async ({ data: { id } }) => {
		const user = await getLoggedInUser();
		await handleDeleteViewGroup(id, user.id);
	});

export const setViewGroupCollapsed = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.number(), isCollapsed: z.boolean() }))
	.handler(async ({ data: { id, isCollapsed } }) => {
		const user = await getLoggedInUser();
		await db
			.update(viewGroups)
			.set({ isCollapsed })
			.where(and(eq(viewGroups.id, id), eq(viewGroups.userId, user.id)));
	});

export const saveSidebarLayout = createServerFn({ method: "POST" })
	.inputValidator(sidebarLayoutSchema)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		await handleSaveSidebarLayout(data, user.id);
	});
