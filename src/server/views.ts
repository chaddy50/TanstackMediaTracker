import { createServerFn } from "@tanstack/react-start";
import {
	and,
	asc,
	count,
	desc,
	eq,
	inArray,
	isNotNull,
	sql,
} from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import {
	mediaItemInstances,
	mediaItemMetadata,
	mediaItemStatusEnum,
	mediaItems,
	mediaTypeEnum,
	series,
	views,
	type ViewFilters,
	type ViewSubject,
} from "#/db/schema";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const viewFiltersSchema = z.object({
	mediaTypes: z.array(z.enum(mediaTypeEnum.enumValues)).optional(),
	statuses: z.array(z.enum(mediaItemStatusEnum.enumValues)).optional(),
	isPurchased: z.boolean().optional(),
	completedThisYear: z.boolean().optional(),
	completedYearStart: z.number().int().optional(),
	completedYearEnd: z.number().int().optional(),
	isSeriesComplete: z.boolean().optional(),
});

const createViewSchema = z.object({
	name: z.string().min(1),
	subject: z.enum(["items", "series"]),
	filters: viewFiltersSchema,
	displayOrder: z.number().int().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCompletedYearCondition(filters: ViewFilters) {
	let yearStart: number | null = null;
	let yearEnd: number | null = null;

	if (filters.completedThisYear) {
		const currentYear = new Date().getFullYear();
		yearStart = currentYear;
		yearEnd = currentYear;
	} else {
		yearStart = filters.completedYearStart ?? null;
		yearEnd = filters.completedYearEnd ?? null;
	}

	if (yearStart === null && yearEnd === null) {
		return undefined;
	}

	const startCondition = yearStart !== null
		? sql`EXTRACT(YEAR FROM ${mediaItemInstances.completedAt}::date) >= ${yearStart}`
		: undefined;
	const endCondition = yearEnd !== null
		? sql`EXTRACT(YEAR FROM ${mediaItemInstances.completedAt}::date) <= ${yearEnd}`
		: undefined;

	const yearConditions = [startCondition, endCondition].filter(
		(c) => c !== undefined,
	);

	return sql`EXISTS (
		SELECT 1 FROM ${mediaItemInstances}
		WHERE ${mediaItemInstances.mediaItemId} = ${mediaItems.id}
			AND ${mediaItemInstances.completedAt} IS NOT NULL
			AND ${and(...yearConditions)}
	)`;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export const getViews = createServerFn({ method: "GET" }).handler(async () => {
	return db.select().from(views).orderBy(asc(views.displayOrder));
});

export type View = Awaited<ReturnType<typeof getViews>>[number];

export const getViewResults = createServerFn({ method: "GET" })
	.inputValidator(z.object({ viewId: z.number() }))
	.handler(async ({ data: { viewId } }) => {
		const [view] = await db.select().from(views).where(eq(views.id, viewId));
		if (!view) throw new Error(`View ${viewId} not found`);

		const filters = (view.filters ?? {}) as ViewFilters;

		if (view.subject === "items") {
			return { view, results: await queryItemResults(filters) };
		}

		return { view, results: await querySeriesResults(filters) };
	});

export type ViewResults = Awaited<ReturnType<typeof getViewResults>>;
export type ItemViewResult = Extract<ViewResults, { view: { subject: "items" } }>["results"][number];
export type SeriesViewResult = Extract<ViewResults, { view: { subject: "series" } }>["results"][number];

async function queryItemResults(filters: ViewFilters) {
	const conditions = [
		filters.mediaTypes?.length
			? inArray(mediaItemMetadata.type, filters.mediaTypes)
			: undefined,
		filters.statuses?.length
			? inArray(mediaItems.status, filters.statuses)
			: undefined,
		filters.isPurchased !== undefined
			? eq(mediaItems.isPurchased, filters.isPurchased)
			: undefined,
		buildCompletedYearCondition(filters),
	].filter((c) => c !== undefined);

	const items = await db
		.select({
			id: mediaItems.id,
			status: mediaItems.status,
			isPurchased: mediaItems.isPurchased,
			mediaItemId: mediaItemMetadata.id,
			title: mediaItemMetadata.title,
			type: mediaItemMetadata.type,
			coverImageUrl: mediaItemMetadata.coverImageUrl,
			seriesId: mediaItems.seriesId,
			seriesName: series.name,
		})
		.from(mediaItems)
		.innerJoin(
			mediaItemMetadata,
			eq(mediaItems.mediaItemMetadataId, mediaItemMetadata.id),
		)
		.leftJoin(series, eq(mediaItems.seriesId, series.id))
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.orderBy(desc(mediaItems.updatedAt));

	if (items.length === 0) return [];

	const itemIds = items.map((item) => item.id);
	const latestRatings = await db
		.selectDistinctOn([mediaItemInstances.mediaItemId], {
			mediaItemId: mediaItemInstances.mediaItemId,
			rating: mediaItemInstances.rating,
		})
		.from(mediaItemInstances)
		.where(
			and(
				inArray(mediaItemInstances.mediaItemId, itemIds),
				isNotNull(mediaItemInstances.completedAt),
			),
		)
		.orderBy(mediaItemInstances.mediaItemId, desc(mediaItemInstances.id));

	const ratingMap = new Map(
		latestRatings.map((r) => [r.mediaItemId, r.rating]),
	);

	return items.map((item) => ({
		...item,
		rating: parseFloat(ratingMap.get(item.mediaItemId) ?? "") || 0,
	}));
}

async function querySeriesResults(filters: ViewFilters) {
	const conditions = [
		filters.mediaTypes?.length
			? inArray(series.type, filters.mediaTypes)
			: undefined,
		filters.statuses?.length
			? inArray(series.status, filters.statuses)
			: undefined,
		filters.isSeriesComplete !== undefined
			? eq(series.isComplete, filters.isSeriesComplete)
			: undefined,
	].filter((c) => c !== undefined);

	const seriesRows = await db
		.select({
			id: series.id,
			name: series.name,
			type: series.type,
			status: series.status,
			rating: series.rating,
			isComplete: series.isComplete,
		})
		.from(series)
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.orderBy(asc(series.name));

	if (seriesRows.length === 0) return [];

	const seriesIds = seriesRows.map((s) => s.id);
	const itemCounts = await db
		.select({
			seriesId: mediaItems.seriesId,
			itemCount: count(),
		})
		.from(mediaItems)
		.where(inArray(mediaItems.seriesId, seriesIds))
		.groupBy(mediaItems.seriesId);

	const countMap = new Map(
		itemCounts.map((r) => [r.seriesId, r.itemCount]),
	);

	return seriesRows.map((s) => ({
		...s,
		rating: parseFloat(s.rating ?? "") || 0,
		itemCount: countMap.get(s.id) ?? 0,
	}));
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export const createView = createServerFn({ method: "POST" })
	.inputValidator(createViewSchema)
	.handler(async ({ data }) => {
		const [created] = await db
			.insert(views)
			.values({
				name: data.name,
				subject: data.subject as ViewSubject,
				filters: data.filters as ViewFilters,
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
			filters: viewFiltersSchema,
			displayOrder: z.number().int().optional(),
		}),
	)
	.handler(async ({ data }) => {
		await db
			.update(views)
			.set({
				name: data.name,
				filters: data.filters as ViewFilters,
				...(data.displayOrder !== undefined
					? { displayOrder: data.displayOrder }
					: {}),
			})
			.where(eq(views.id, data.id));
	});

export const deleteView = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.number() }))
	.handler(async ({ data: { id } }) => {
		await db.delete(views).where(eq(views.id, id));
	});
