import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/database/index";
import {
	type FilterAndSortOptions,
	type ViewSubject,
	views,
} from "#/database/schema";
import { getLoggedInUser } from "#/features/screens/auth/session";
import {
	findOwnedView,
	handleGetViewOrderItems,
	handleGetViewStats,
	handleReorderViewItems,
} from "#/features/screens/customView/view.server";
import { filterAndSortOptionsSchema } from "#/lib/filterAndSort";
import { runItemQuery } from "#/lib/queries/itemQuery.server";
import { runSeriesQuery } from "#/lib/queries/seriesQuery.server";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const createViewSchema = z.object({
	name: z.string().min(1),
	subject: z.enum(["items", "series"]),
	filters: filterAndSortOptionsSchema,
	displayOrder: z.number().int().optional(),
});

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export const getViews = createServerFn({ method: "GET" }).handler(async () => {
	const user = await getLoggedInUser();
	return db
		.select()
		.from(views)
		.where(eq(views.userId, user.id))
		.orderBy(asc(views.displayOrder));
});

export type View = Awaited<ReturnType<typeof getViews>>[number];

export const getViewResults = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			viewId: z.number(),
			titleQuery: z.string().optional(),
			offset: z.number().default(0),
		}),
	)
	.handler(async ({ data: { viewId, titleQuery, offset } }) => {
		const user = await getLoggedInUser();
		const view = await findOwnedView(viewId, user.id);

		const filters = {
			...(view.filters ?? {}),
			titleQuery,
		} as FilterAndSortOptions;

		if (view.subject === "items") {
			return {
				view,
				results: await runItemQuery(filters, user.id, offset, view.id),
			};
		}

		return {
			view,
			results: await runSeriesQuery(filters, user.id, offset),
		};
	});

export const getViewOrderItems = createServerFn({ method: "GET" })
	.inputValidator(z.object({ viewId: z.number() }))
	.handler(async ({ data: { viewId } }) => {
		const user = await getLoggedInUser();
		return handleGetViewOrderItems(viewId, user.id);
	});

export const getViewStats = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			viewId: z.number(),
			titleQuery: z.string().optional(),
		}),
	)
	.handler(async ({ data: { viewId, titleQuery } }) => {
		const user = await getLoggedInUser();
		return handleGetViewStats(viewId, user.id, titleQuery);
	});

export type ViewResults = Awaited<ReturnType<typeof getViewResults>>;
export type ItemViewResult = Extract<
	ViewResults,
	{ view: { subject: "items" } }
>["results"][number];
export type SeriesViewResult = Extract<
	ViewResults,
	{ view: { subject: "series" } }
>["results"][number];

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export const createView = createServerFn({ method: "POST" })
	.inputValidator(createViewSchema)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		const [created] = await db
			.insert(views)
			.values({
				userId: user.id,
				name: data.name,
				subject: data.subject as ViewSubject,
				filters: data.filters as FilterAndSortOptions,
				displayOrder: data.displayOrder ?? 999,
			})
			.returning();
		return created;
	});

export const updateView = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			id: z.number(),
			name: z.string().min(1),
			filters: filterAndSortOptionsSchema,
			displayOrder: z.number().int().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		await db
			.update(views)
			.set({
				name: data.name,
				filters: data.filters as FilterAndSortOptions,
				...(data.displayOrder !== undefined
					? { displayOrder: data.displayOrder }
					: {}),
			})
			.where(and(eq(views.id, data.id), eq(views.userId, user.id)));
	});

export const deleteView = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.number() }))
	.handler(async ({ data: { id } }) => {
		const user = await getLoggedInUser();
		await db
			.delete(views)
			.where(and(eq(views.id, id), eq(views.userId, user.id)));
	});

export const reorderViews = createServerFn({ method: "POST" })
	.inputValidator(z.object({ orderedIds: z.array(z.number()) }))
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		await Promise.all(
			data.orderedIds.map((id, index) =>
				db
					.update(views)
					.set({ displayOrder: index })
					.where(and(eq(views.id, id), eq(views.userId, user.id))),
			),
		);
	});

export const reorderViewItems = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			viewId: z.number(),
			orderedMediaItemIds: z.array(z.number()),
		}),
	)
	.handler(async ({ data: { viewId, orderedMediaItemIds } }) => {
		const user = await getLoggedInUser();
		await handleReorderViewItems(viewId, orderedMediaItemIds, user.id);
	});
