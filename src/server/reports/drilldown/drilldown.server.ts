import { sql } from "drizzle-orm";

import { db } from "#/db/index";
import type { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/server/enums";
import type { DrillDownItem } from "../types";

export async function fetchDrillDownItemsForMonth(
	userId: string,
	month: string, // "YYYY-MM"
	mediaTypes?: MediaItemType[] | null,
): Promise<DrillDownItem[]> {
	const filteredTypes = mediaTypes && mediaTypes.length > 0 ? mediaTypes : [];
	const hasTypeFilter = filteredTypes.length > 0;

	const rows = await db.execute<{
		id: number;
		status: string;
		purchase_status: string;
		title: string;
		type: string;
		cover_image_url: string | null;
		rating: string | null;
		completed_at: string | null;
		expected_release_date: string | null;
		series_id: number | null;
		series_name: string | null;
	}>(sql`
		SELECT * FROM (
			SELECT DISTINCT ON (mi.id)
				mi.id,
				mi.status,
				mi.purchase_status,
				mim.title,
				mim.type,
				mim.cover_image_url,
				inst.rating,
				inst.completed_at,
				mi.expected_release_date,
				mi.series_id,
				s.name AS series_name
			FROM media_item_instances inst
			JOIN media_items mi ON inst.media_item_id = mi.id
			JOIN media_metadata mim ON mi.media_item_metadata_id = mim.id
			LEFT JOIN series s ON mi.series_id = s.id
			WHERE
				mi.user_id = ${userId}
				AND inst.completed_at IS NOT NULL
				AND to_char(inst.completed_at, 'YYYY-MM') = ${month}
				${
					hasTypeFilter
						? sql`AND mim.type::text = ANY(ARRAY[${sql.join(
								filteredTypes.map((t) => sql`${t}`),
								sql`, `,
							)}]::text[])`
						: sql``
				}
			ORDER BY mi.id, inst.completed_at DESC
		) sub
		ORDER BY sub.completed_at DESC
	`);

	return rows.rows.map((row) => ({
		id: row.id,
		status: row.status as MediaItemStatus,
		purchaseStatus: row.purchase_status as PurchaseStatus,
		title: row.title,
		type: row.type as MediaItemType,
		coverImageUrl: row.cover_image_url,
		rating: row.rating ? Number(row.rating) : 0,
		completedAt: row.completed_at,
		expectedReleaseDate: row.expected_release_date,
		seriesId: row.series_id,
		seriesName: row.series_name,
	}));
}

export async function fetchDrillDownItemsForGenre(
	userId: string,
	genre: string,
	startDate: string,
	endDate: string,
	mediaTypes?: MediaItemType[] | null,
): Promise<DrillDownItem[]> {
	const filteredTypes = mediaTypes && mediaTypes.length > 0 ? mediaTypes : [];
	const hasTypeFilter = filteredTypes.length > 0;

	const rows = await db.execute<{
		id: number;
		status: string;
		purchase_status: string;
		title: string;
		type: string;
		cover_image_url: string | null;
		rating: string | null;
		completed_at: string | null;
		expected_release_date: string | null;
		series_id: number | null;
		series_name: string | null;
	}>(sql`
		SELECT * FROM (
			SELECT DISTINCT ON (mi.id)
				mi.id,
				mi.status,
				mi.purchase_status,
				mim.title,
				mim.type,
				mim.cover_image_url,
				inst.rating,
				inst.completed_at,
				mi.expected_release_date,
				mi.series_id,
				s.name AS series_name
			FROM media_item_instances inst
			JOIN media_items mi ON inst.media_item_id = mi.id
			JOIN media_metadata mim ON mi.media_item_metadata_id = mim.id
			JOIN genres g ON mi.genre_id = g.id
			LEFT JOIN series s ON mi.series_id = s.id
			WHERE
				mi.user_id = ${userId}
				AND inst.completed_at IS NOT NULL
				AND inst.completed_at >= ${startDate}
				AND inst.completed_at <= ${endDate}
				AND g.name = ${genre}
				${
					hasTypeFilter
						? sql`AND mim.type::text = ANY(ARRAY[${sql.join(
								filteredTypes.map((t) => sql`${t}`),
								sql`, `,
							)}]::text[])`
						: sql``
				}
			ORDER BY mi.id, inst.completed_at DESC
		) sub
		ORDER BY sub.completed_at DESC
	`);

	return rows.rows.map((row) => ({
		id: row.id,
		status: row.status as MediaItemStatus,
		purchaseStatus: row.purchase_status as PurchaseStatus,
		title: row.title,
		type: row.type as MediaItemType,
		coverImageUrl: row.cover_image_url,
		rating: row.rating ? Number(row.rating) : 0,
		completedAt: row.completed_at,
		expectedReleaseDate: row.expected_release_date,
		seriesId: row.series_id,
		seriesName: row.series_name,
	}));
}
