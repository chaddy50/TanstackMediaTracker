/**
 * Import tags from a Notion CSV export into the media tracker database.
 * Reads only the Name and Tags columns. Matches items by title.
 *
 * Usage:
 *   npm run import:tags -- <user-email> <path-to-csv> [--dry-run]
 *
 * The CSV is expected to be a Notion export with at least these columns:
 *   Name, Tags
 */

import { config as loadDotenv } from "dotenv";
import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { parse as parseCsv } from "csv-parse/sync";
import { readFileSync } from "node:fs";

import * as schema from "#/db/schema";
import {
	mediaItemMetadata,
	mediaItems,
	mediaItemTags,
	tags,
	user,
} from "#/db/schema";

loadDotenv({ path: ".env.local" });
loadDotenv({ path: ".env" });

type CsvRow = {
	Name: string;
	Tags: string;
	[key: string]: string;
};

async function main() {
	const args = process.argv.slice(2);
	const isDryRun = args.includes("--dry-run");
	const filteredArgs = args.filter((argument) => argument !== "--dry-run");

	if (filteredArgs.length < 2) {
		console.error(
			"Usage: tsx scripts/import-tags.ts <user-email> <path-to-csv> [--dry-run]",
		);
		process.exit(1);
	}

	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		console.error(
			"DATABASE_URL environment variable is not set.\n" +
				"Run via: npm run import:tags -- <email> <csv-path>",
		);
		process.exit(1);
	}

	const pool = new Pool({ connectionString: databaseUrl });
	const database = drizzle(pool, { schema });

	const userEmail = filteredArgs[0];
	const csvPath = filteredArgs[1];

	if (isDryRun) {
		console.log("DRY RUN — no data will be written to the database.\n");
	}

	try {
		// 1. Look up user
		const [foundUser] = await database
			.select({ id: user.id, name: user.name })
			.from(user)
			.where(eq(user.email, userEmail));

		if (!foundUser) {
			console.error(`User not found with email: ${userEmail}`);
			process.exit(1);
		}
		console.log(`Found user: ${foundUser.name} (${foundUser.id})\n`);

		// 2. Parse CSV
		const csvContent = readFileSync(csvPath, "utf-8");
		const csvContentClean = csvContent.replace(/^\uFEFF/, "");
		const rows: CsvRow[] = parseCsv(csvContentClean, {
			columns: true,
			skip_empty_lines: true,
			trim: true,
		});

		// 3. Filter to rows with non-empty Name and Tags
		const rowsWithTags = rows.filter(
			(row) => row.Name?.trim() && row.Tags?.trim(),
		);

		console.log(
			`CSV: ${rows.length} total rows, ${rowsWithTags.length} with tags\n`,
		);

		let rowsProcessed = 0;
		let itemsMatched = 0;
		let itemsSkipped = 0;
		let tagsCreated = 0;

		for (const row of rowsWithTags) {
			rowsProcessed++;
			const titleRaw = row.Name.trim();
			const tagNames = row.Tags.split(",")
				.map((tagName) => tagName.trim())
				.filter((tagName) => tagName.length > 0);

			if (tagNames.length === 0) {
				continue;
			}

			// Find matching media item by title (case-insensitive)
			const [matchedItem] = await database
				.select({ id: mediaItems.id })
				.from(mediaItems)
				.innerJoin(
					mediaItemMetadata,
					eq(mediaItemMetadata.id, mediaItems.mediaItemMetadataId),
				)
				.where(
					and(
						eq(mediaItems.userId, foundUser.id),
						sql`lower(${mediaItemMetadata.title}) = lower(${titleRaw})`,
					),
				);

			if (!matchedItem) {
				console.warn(`  SKIP "${titleRaw}" — no matching item found`);
				itemsSkipped++;
				continue;
			}

			console.log(`  "${titleRaw}" -> [${tagNames.join(", ")}]`);
			itemsMatched++;

			if (isDryRun) {
				continue;
			}

			// Upsert tags
			await database
				.insert(tags)
				.values(tagNames.map((tagName) => ({ userId: foundUser.id, name: tagName })))
				.onConflictDoNothing();

			// Resolve tag IDs
			const resolvedTagRows = await database
				.select({ id: tags.id })
				.from(tags)
				.where(
					and(eq(tags.userId, foundUser.id), inArray(tags.name, tagNames)),
				);

			tagsCreated += resolvedTagRows.length;

			// Insert tag associations
			await database
				.insert(mediaItemTags)
				.values(
					resolvedTagRows.map((tagRow) => ({
						mediaItemId: matchedItem.id,
						tagId: tagRow.id,
					})),
				)
				.onConflictDoNothing();
		}

		console.log("\n--- Import Summary ---");
		console.log(`Rows processed:  ${rowsProcessed}`);
		console.log(`Items matched:   ${itemsMatched}`);
		console.log(`Items skipped:   ${itemsSkipped}`);
		if (!isDryRun) {
			console.log(`Tags upserted:   ${tagsCreated}`);
			console.log("\nImport complete!");
		} else {
			console.log("\n(DRY RUN — nothing was written to the database)");
		}
	} finally {
		await pool.end();
	}
}

main().catch((error) => {
	console.error("Import failed:", error);
	process.exit(1);
});
