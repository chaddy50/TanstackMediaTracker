import { z } from "zod";

import {
	mediaItemStatusEnum,
	mediaTypeEnum,
	purchaseStatusEnum,
} from "#/database/schema";
import type { PurchaseStatus } from "#/lib/enums";
import { ITEM_SORT_FIELDS, SERIES_SORT_FIELDS } from "#/lib/sortFields";

/**
 * The filter and sort options shared by the library, series, and custom view
 * screens. It lives here rather than beside any one of them because it is also
 * the `validateSearch` schema for their routes, so every consumer would
 * otherwise have to reach into a sibling feature for it.
 */
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

/**
 * True when a view's filters pin its results to exactly one purchase status.
 * Every card on screen then shares that status, so callers suppress the
 * purchase badge as redundant.
 */
export function isFilteredToSinglePurchaseStatus(
	purchaseStatuses: PurchaseStatus[] | null | undefined,
): boolean {
	return purchaseStatuses?.length === 1;
}
