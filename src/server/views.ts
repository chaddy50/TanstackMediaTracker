import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import {
	type FilterAndSortOptions,
	mediaItemStatusEnum,
	mediaTypeEnum,
	purchaseStatusEnum,
	type ViewSubject,
	views,
} from "#/db/schema";
import { getLoggedInUser } from "#/lib/session";
import { ITEM_SORT_FIELDS, SERIES_SORT_FIELDS } from "#/lib/sortFields";
import { queryItemResults, querySeriesResults } from "#/server/itemQueries";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const filterAndSortOptionsSchema = z.object({
	mediaTypes: z.array(z.enum(mediaTypeEnum.enumValues)).optional(),
	statuses: z.array(z.enum(mediaItemStatusEnum.enumValues)).optional(),
	purchaseStatuses: z.array(z.enum(purchaseStatusEnum.enumValues)).optional(),
	completedThisYear: z.boolean().optional(),
	completedDateStart: z.string().optional(),
	completedDateEnd: z.string().optional(),
	isSeriesComplete: z.boolean().optional(),
	tags: z.array(z.string()).optional(),
	genres: z.array(z.string()).optional(),
	sortBy: z.enum([...ITEM_SORT_FIELDS, ...SERIES_SORT_FIELDS]).optional(),
	sortDirection: z.enum(["asc", "desc"]).optional(),
	titleQuery: z.string().optional(),
	creatorQuery: z.string().optional(),
});

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
		const [view] = await db
			.select()
			.from(views)
			.where(and(eq(views.id, viewId), eq(views.userId, user.id)));
		if (!view) throw new Error(`View ${viewId} not found`);

		const filters = {
			...(view.filters ?? {}),
			titleQuery,
		} as FilterAndSortOptions;

		if (view.subject === "items") {
			return {
				view,
				results: await queryItemResults(filters, user.id, offset),
			};
		}

		return {
			view,
			results: await querySeriesResults(filters, user.id, offset),
		};
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
