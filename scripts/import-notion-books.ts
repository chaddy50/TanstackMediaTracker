/**
 * Import Notion book tracking CSV into the media tracker database.
 * Searches the Hardcover API for each book to get rich metadata (cover images,
 * descriptions, series info). Falls back to a custom import for books not found.
 *
 * Usage:
 *   npm run import:notion-books -- <user-email> <path-to-csv> [--dry-run]
 *
 * The CSV is expected to be a Notion export with these columns:
 *   Name, Author, Blurb, Book Series, Date Finished, First Published, Format, Genre,
 *   How found?, Look for sequels?, Original Publication Year, Own?, Page Count, Publisher,
 *   Publishing/Release Date, Reread Dates, Score, Score /5, Series #, Status, Tags, Type, Want to Buy?
 */

import { config as loadDotenv } from "dotenv";
import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { parse as parseCsv } from "csv-parse/sync";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

import * as schema from "#/db/schema";
import {
	mediaItemInstances,
	mediaItemMetadata,
	mediaItems,
	series,
	user,
} from "#/db/schema";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";
import * as hardcoverApi from "#/lib/api/hardcover";
import { RateLimitError } from "#/lib/api/hardcover";
import type { ExternalSearchResult } from "#/lib/api/types";

// Load .env.local directly (belt-and-suspenders alongside dotenv-cli)
loadDotenv({ path: ".env.local" });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CsvRow = {
	Name: string;
	Author: string;
	Blurb: string;
	"Book Series": string;
	"Date Finished": string;
	"First Published": string;
	Format: string;
	Genre: string;
	"How found?": string;
	"Look for sequels?": string;
	"Original Publication Year": string;
	"Own?": string;
	"Page Count": string;
	Publisher: string;
	"Publishing/Release Date": string;
	"Reread Dates": string;
	Score: string;
	"Score /5": string;
	"Series #": string;
	Status: string;
	Tags: string;
	Type: string;
	"Want to Buy?": string;
};

type BookMetadata = {
	author?: string;
	pageCount?: number;
	genres?: string[];
	series?: string;
	seriesBookNumber?: string;
};

type MediaItemStatusValue =
	(typeof MediaItemStatus)[keyof typeof MediaItemStatus];

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------

const STATUS_MAP: Record<string, MediaItemStatusValue | null> = {
	Done: MediaItemStatus.COMPLETED,
	Backlog: MediaItemStatus.BACKLOG,
	"In Progress": MediaItemStatus.IN_PROGRESS,
	"On Hold": MediaItemStatus.ON_HOLD,
	DNF: MediaItemStatus.DROPPED,
	Waiting: MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
	"On Deck": MediaItemStatus.NEXT_UP,
	"Not Interested": null, // skip
};

// ---------------------------------------------------------------------------
// Date parsing
// ---------------------------------------------------------------------------

function parseDate(dateString: string): string | null {
	const trimmed = dateString.trim();
	if (!trimmed) {
		return null;
	}

	// Year only (possibly with comma formatting like "2,022")
	if (/^\d{4}$/.test(trimmed) || /^\d{1,2},\d{3}$/.test(trimmed)) {
		const year = trimmed.replace(",", "");
		const result = `${year}-01-01`;
		return isPlausibleYear(result) ? result : null;
	}

	// M/D/YYYY short format
	const shortDateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (shortDateMatch) {
		const month = shortDateMatch[1].padStart(2, "0");
		const day = shortDateMatch[2].padStart(2, "0");
		const year = shortDateMatch[3];
		return `${year}-${month}-${day}`;
	}

	// "Month Day, Year" long format
	const parsed = new Date(trimmed);
	if (!Number.isNaN(parsed.getTime())) {
		const year = parsed.getFullYear();
		const month = String(parsed.getMonth() + 1).padStart(2, "0");
		const day = String(parsed.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	return null;
}

function isPlausibleYear(dateString: string): boolean {
	const year = parseInt(dateString.slice(0, 4), 10);
	return !Number.isNaN(year) && year >= 1000 && year <= 2100;
}

function getYear(dateString: string): number {
	return parseInt(dateString.slice(0, 4), 10);
}

function collectReadDates(
	dateFinished: string,
	rereadDatesRaw: string,
): string[] {
	const primaryDate = parseDate(dateFinished);
	const allDates: string[] = [];

	if (primaryDate) {
		allDates.push(primaryDate);
	}

	if (rereadDatesRaw.trim()) {
		for (const part of rereadDatesRaw.split(",").map((s) => s.trim())) {
			if (!part) {
				continue;
			}
			const parsed = parseDate(part);
			if (!parsed) {
				continue;
			}
			// Skip if same year as primary (Date Finished is more precise)
			if (primaryDate && getYear(parsed) === getYear(primaryDate)) {
				continue;
			}
			// Deduplicate by year
			if (!allDates.some((d) => getYear(d) === getYear(parsed))) {
				allDates.push(parsed);
			}
		}
	}

	return allDates.sort();
}

function resolveReleaseDate(row: CsvRow): string | null {
	return (
		parseDate(row["Publishing/Release Date"]) ??
		parseDate(row["First Published"]) ??
		parseDate(row["Original Publication Year"])
	);
}

function parseGenres(genreString: string): string[] {
	if (!genreString.trim()) {
		return [];
	}
	return genreString
		.split(",")
		.map((g) => g.trim())
		.filter((g) => g.length > 0);
}

// ---------------------------------------------------------------------------
// Series status computation
// ---------------------------------------------------------------------------

function computeSeriesStatus(
	itemStatuses: MediaItemStatusValue[],
): MediaItemStatusValue {
	if (itemStatuses.some((s) => s === MediaItemStatus.IN_PROGRESS)) {
		return MediaItemStatus.IN_PROGRESS;
	}
	if (
		itemStatuses.every(
			(s) =>
				s === MediaItemStatus.COMPLETED || s === MediaItemStatus.DROPPED,
		)
	) {
		return MediaItemStatus.COMPLETED;
	}
	if (itemStatuses.some((s) => s === MediaItemStatus.COMPLETED)) {
		return MediaItemStatus.IN_PROGRESS;
	}
	return MediaItemStatus.BACKLOG;
}

// ---------------------------------------------------------------------------
// Hardcover matching
// ---------------------------------------------------------------------------

function stripNotionLink(value: string): string {
	return value.replace(/\s*\(https:\/\/www\.notion\.so\/[^\)]*\)/g, "").trim();
}

function normalizeForComparison(title: string): string {
	return title
		.toLowerCase()
		// Common mojibake from Notion CSV exports
		.replace(/â€™/g, "'")
		.replace(/â€œ/g, '"')
		.replace(/â€/g, '"')
		.replace(/â€"/g, "--")
		.replace(/â/g, "")
		// Various fancy quote/apostrophe characters → ASCII
		.replace(/[\u2018\u2019\u02bc\u02b9]/g, "'")
		.replace(/[\u201c\u201d]/g, '"')
		.replace(/\u2014/g, "--")
		.replace(/\u2013/g, "-")
		// Strip remaining non-alphanumeric (except spaces)
		.replace(/[^\w\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function jaccardSimilarity(normalizedA: string, normalizedB: string): number {
	const wordsA = new Set(normalizedA.split(" ").filter((w) => w.length > 1));
	const wordsB = new Set(normalizedB.split(" ").filter((w) => w.length > 1));
	if (wordsA.size === 0 || wordsB.size === 0) {
		return 0;
	}
	let intersectionSize = 0;
	for (const word of wordsA) {
		if (wordsB.has(word)) {
			intersectionSize++;
		}
	}
	const unionSize = wordsA.size + wordsB.size - intersectionSize;
	return intersectionSize / unionSize;
}

function findBestMatch(
	csvTitle: string,
	results: ExternalSearchResult[],
): ExternalSearchResult | null {
	if (results.length === 0) {
		return null;
	}
	const normalizedCsv = normalizeForComparison(csvTitle);

	for (const result of results) {
		const normalizedResult = normalizeForComparison(result.title);

		// 1. Exact normalized match
		if (normalizedResult === normalizedCsv) {
			return result;
		}

		// 2. Prefix match — handles subtitle variations since normalization converts
		//    ':' to a space, so "A Deadly Education: Lesson One" becomes
		//    "a deadly education lesson one" which starts with "a deadly education"
		if (normalizedCsv.length >= 4) {
			if (
				normalizedResult.startsWith(`${normalizedCsv} `) ||
				normalizedCsv.startsWith(`${normalizedResult} `)
			) {
				return result;
			}
		}
	}

	// 3. Best Jaccard word-overlap match (threshold ≥ 0.65)
	let bestScore = 0;
	let bestResult: ExternalSearchResult | null = null;
	for (const result of results) {
		const score = jaccardSimilarity(
			normalizedCsv,
			normalizeForComparison(result.title),
		);
		if (score > bestScore) {
			bestScore = score;
			bestResult = result;
		}
	}
	if (bestScore >= 0.65) {
		return bestResult;
	}

	return null; // No confident match found
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Hardcover allows 60 requests/minute. hardcoverApi.search() makes 2 HTTP calls
// internally (search + images), so we need ≥ 2000ms between search() calls.
// fetchSeriesInfo() makes 1 HTTP call, so ≥ 1000ms between those.
const BOOK_SEARCH_DELAY_MS = 1600;
const SERIES_SEARCH_DELAY_MS = 1000;

// Max wait time when backing off from a rate-limit response
const RATE_LIMIT_BACKOFF_MS = 65_000;

async function searchBook(
	query: string,
): Promise<ExternalSearchResult[]> {
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const results = await hardcoverApi.search(query);
			await sleep(BOOK_SEARCH_DELAY_MS);
			return results;
		} catch (error) {
			if (error instanceof RateLimitError) {
				console.log(
					`  ⏸ Rate limited — waiting ${RATE_LIMIT_BACKOFF_MS / 1000}s before retry (attempt ${attempt + 1}/3)...`,
				);
				await sleep(RATE_LIMIT_BACKOFF_MS);
			} else {
				throw error;
			}
		}
	}
	return [];
}

async function fetchSeriesInfoWithRetry(
	name: string,
): Promise<{ description: string | null; isComplete: boolean } | null> {
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const result = await hardcoverApi.fetchSeriesInfo(name);
			await sleep(SERIES_SEARCH_DELAY_MS);
			return result;
		} catch (error) {
			if (error instanceof RateLimitError) {
				console.log(
					`  ⏸ Rate limited — waiting ${RATE_LIMIT_BACKOFF_MS / 1000}s before retry (attempt ${attempt + 1}/3)...`,
				);
				await sleep(RATE_LIMIT_BACKOFF_MS);
			} else {
				throw error;
			}
		}
	}
	return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const args = process.argv.slice(2);
	const isDryRun = args.includes("--dry-run");
	const filteredArgs = args.filter((a) => a !== "--dry-run");

	if (filteredArgs.length < 2) {
		console.error(
			"Usage: tsx scripts/import-notion-books.ts <user-email> <path-to-csv> [--dry-run]",
		);
		process.exit(1);
	}

	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		console.error(
			"DATABASE_URL environment variable is not set.\n" +
				"Run via: npm run import:notion-books -- <email> <csv-path>",
		);
		process.exit(1);
	}

	const hasHardcoverKey = Boolean(process.env.HARDCOVER_API_KEY);
	if (!hasHardcoverKey) {
		console.warn(
			"⚠️  HARDCOVER_API_KEY not set — all books will be imported as custom items without cover images or rich metadata.\n",
		);
	}

	const pool = new Pool({ connectionString: databaseUrl });
	const db = drizzle(pool, { schema });

	const userEmail = filteredArgs[0];
	const csvPath = filteredArgs[1];

	if (isDryRun) {
		console.log("🔍 DRY RUN — no data will be written to the database.\n");
	}

	try {
		// 1. Look up user
		const [foundUser] = await db
			.select({ id: user.id, name: user.name })
			.from(user)
			.where(eq(user.email, userEmail));

		if (!foundUser) {
			console.error(`User not found with email: ${userEmail}`);
			process.exit(1);
		}
		console.log(`Found user: ${foundUser.name} (${foundUser.id})\n`);

		// 2. Warn if user already has books
		const [existingItem] = await db
			.select({ id: mediaItems.id })
			.from(mediaItems)
			.where(eq(mediaItems.userId, foundUser.id));

		if (existingItem) {
			console.warn(
				"⚠️  Warning: this user already has items in the library. Import will add to existing data.\n",
			);
		}

		// 3. Parse CSV
		const csvContent = readFileSync(csvPath, "utf-8");
		const csvContentClean = csvContent.replace(/^\uFEFF/, "");
		const rows: CsvRow[] = parseCsv(csvContentClean, {
			columns: true,
			skip_empty_lines: true,
			trim: true,
		});

		// 4. Filter rows
		const validRows = rows.filter((row) => {
			if (!row.Name?.trim()) {
				return false;
			}
			if (STATUS_MAP[row.Status] === null) {
				return false; // "Not Interested"
			}
			return true;
		});

		const skippedCount = rows.length - validRows.length;
		console.log(
			`CSV: ${rows.length} total rows, ${validRows.length} to import, ${skippedCount} skipped\n`,
		);

		// 5. Create series records (fetching info from Hardcover)
		const csvSeriesNames = [
			...new Set(
				validRows
					.map((row) => stripNotionLink(row["Book Series"].trim()))
					.filter((name) => name.length > 0),
			),
		];

		console.log(
			`Creating ${csvSeriesNames.length} series (querying Hardcover for descriptions)...\n`,
		);
		const seriesNameToId = new Map<string, number>();
		// Track statuses per series to compute final series status after import
		const seriesItemStatuses = new Map<string, MediaItemStatusValue[]>();

		for (const seriesName of csvSeriesNames) {
			seriesItemStatuses.set(seriesName, []);

			// Reuse if user already has this series
			const [existing] = await db
				.select({ id: series.id })
				.from(series)
				.where(
					and(
						eq(series.userId, foundUser.id),
						eq(series.name, seriesName),
						eq(series.type, MediaItemType.BOOK),
					),
				);

			if (existing) {
				seriesNameToId.set(seriesName, existing.id);
				console.log(`  ↩ "${seriesName}" — reusing existing series`);
				continue;
			}

			let description: string | null = null;
			let isComplete = false;

			if (hasHardcoverKey) {
				const seriesInfo = await fetchSeriesInfoWithRetry(seriesName);
				if (seriesInfo) {
					description = seriesInfo.description;
					isComplete = seriesInfo.isComplete;
					console.log(
						`  ✓ "${seriesName}" — found on Hardcover (complete: ${isComplete})`,
					);
				} else {
					console.log(`  ? "${seriesName}" — not found on Hardcover`);
				}
			} else {
				console.log(`  + "${seriesName}" — custom`);
			}

			if (!isDryRun) {
				const [inserted] = await db
					.insert(series)
					.values({
						userId: foundUser.id,
						name: seriesName,
						type: MediaItemType.BOOK,
						status: MediaItemStatus.BACKLOG, // updated after items are inserted
						description,
						isComplete,
					})
					.returning({ id: series.id });
				seriesNameToId.set(seriesName, inserted.id);
			} else {
				seriesNameToId.set(seriesName, Math.floor(Math.random() * 10000));
			}
		}

		console.log();

		// 6. Import each book
		let importedCount = 0;
		let hardcoverMatchCount = 0;
		let customFallbackCount = 0;
		let instanceCount = 0;

		for (const row of validRows) {
			const csvTitle = stripNotionLink(row.Name.trim());
			const csvAuthor = stripNotionLink(row.Author.trim());
			const csvSeriesName = stripNotionLink(row["Book Series"].trim());
			const seriesId = csvSeriesName
				? (seriesNameToId.get(csvSeriesName) ?? null)
				: null;
			const status: MediaItemStatusValue =
				STATUS_MAP[row.Status] ?? MediaItemStatus.BACKLOG;
			const isPurchased = row["Own?"].trim().toLowerCase() === "yes";
			const csvScore = row.Score.trim() || null;
			const csvPageCount = row["Page Count"].trim()
				? parseInt(row["Page Count"].replace(/,/g, ""), 10)
				: undefined;
			const csvSeriesBookNumber = row["Series #"].trim() || undefined;
			const csvGenres = parseGenres(row.Genre);
			const readDates = collectReadDates(
				row["Date Finished"],
				row["Reread Dates"],
			);

			// Track per-series item statuses for later series status update
			if (csvSeriesName) {
				const statuses = seriesItemStatuses.get(csvSeriesName) ?? [];
				statuses.push(status);
				seriesItemStatuses.set(csvSeriesName, statuses);
			}

			// Search Hardcover (or fall back to custom)
			let externalId: string;
			let externalSource: string;
			let bookDescription: string | null;
			let coverImageUrl: string | null;
			let releaseDate: string | null;
			let resolvedAuthor: string | undefined;
			let resolvedPageCount: number | undefined;
			let resolvedGenres: string[] | undefined;
			let hardcoverSeriesBookNumber: string | undefined;
			let foundOnHardcover = false;

			if (hasHardcoverKey) {
				// Strategy 1: title + author (most specific)
				const queryWithAuthor = csvAuthor
					? `${csvTitle} ${csvAuthor}`
					: csvTitle;
				const resultsWithAuthor = await searchBook(queryWithAuthor);
				let match = findBestMatch(csvTitle, resultsWithAuthor);

				// Strategy 2: title only (fallback when author name format differs)
				if (!match && csvAuthor) {
					const resultsTitleOnly = await searchBook(csvTitle);
					match = findBestMatch(csvTitle, resultsTitleOnly);
				}

				if (match) {
					const matchMeta = match.metadata as BookMetadata;
					externalId = match.externalId;
					externalSource = "hardcover";
					bookDescription = row.Blurb.trim() || match.description || null;
					coverImageUrl = match.coverImageUrl ?? null;
					releaseDate =
						resolveReleaseDate(row) ??
						(match.releaseDate && isPlausibleYear(match.releaseDate)
							? String(match.releaseDate)
							: null);
					resolvedAuthor = matchMeta.author || csvAuthor || undefined;
					resolvedPageCount =
						csvPageCount && !Number.isNaN(csvPageCount)
							? csvPageCount
							: matchMeta.pageCount;
					resolvedGenres =
						csvGenres.length > 0 ? csvGenres : matchMeta.genres;
					hardcoverSeriesBookNumber = matchMeta.seriesBookNumber;
					foundOnHardcover = true;
					hardcoverMatchCount++;
				} else {
					externalId = randomUUID();
					externalSource = "custom";
					bookDescription = row.Blurb.trim() || null;
					coverImageUrl = null;
					releaseDate = resolveReleaseDate(row);
					resolvedAuthor = csvAuthor || undefined;
					resolvedPageCount =
						csvPageCount && !Number.isNaN(csvPageCount)
							? csvPageCount
							: undefined;
					resolvedGenres = csvGenres.length > 0 ? csvGenres : undefined;
					customFallbackCount++;
				}
			} else {
				externalId = randomUUID();
				externalSource = "custom";
				bookDescription = row.Blurb.trim() || null;
				coverImageUrl = null;
				releaseDate = resolveReleaseDate(row);
				resolvedAuthor = csvAuthor || undefined;
				resolvedPageCount =
					csvPageCount && !Number.isNaN(csvPageCount) ? csvPageCount : undefined;
				resolvedGenres = csvGenres.length > 0 ? csvGenres : undefined;
				customFallbackCount++;
			}

			// seriesBookNumber: prefer CSV value, fallback to Hardcover's
			const seriesBookNumber = csvSeriesBookNumber ?? hardcoverSeriesBookNumber;

			const instancesLabel =
				readDates.length > 0
					? `${readDates.length} instance(s): [${readDates.join(", ")}]`
					: csvScore
						? "1 instance (no dates, has rating)"
						: "no instances";

			const matchLabel = foundOnHardcover ? "✓ Hardcover" : "? custom  ";

			if (isDryRun) {
				console.log(
					`  [${matchLabel}] "${csvTitle}" | status=${status} | series="${csvSeriesName || "(none)"}" | ${instancesLabel}`,
				);
				importedCount++;
				continue;
			}

			// a. Upsert mediaItemMetadata (shared cache — onConflictDoNothing reuses existing)
			const [insertedMeta] = await db
				.insert(mediaItemMetadata)
				.values({
					type: MediaItemType.BOOK,
					title: csvTitle,
					description: bookDescription,
					coverImageUrl,
					releaseDate,
					externalId,
					externalSource,
					metadata: {
						author: resolvedAuthor,
						pageCount:
							resolvedPageCount && !Number.isNaN(resolvedPageCount)
								? resolvedPageCount
								: undefined,
						genres:
							resolvedGenres && resolvedGenres.length > 0
								? resolvedGenres
								: undefined,
						series: csvSeriesName || undefined,
						seriesBookNumber,
					},
				})
				.onConflictDoNothing()
				.returning({ id: mediaItemMetadata.id });

			// If metadata already existed (same Hardcover ID from another user), look it up
			const metadataId =
				insertedMeta?.id ??
				(
					await db
						.select({ id: mediaItemMetadata.id })
						.from(mediaItemMetadata)
						.where(
							and(
								eq(mediaItemMetadata.externalId, externalId),
								eq(mediaItemMetadata.externalSource, externalSource),
							),
						)
				)[0]?.id;

			if (!metadataId) {
				console.error(`  ✗ Failed to get metadata ID for "${csvTitle}"`);
				continue;
			}

			// b. Check if user already has this item
			const [existingMediaItem] = await db
				.select({ id: mediaItems.id })
				.from(mediaItems)
				.where(
					and(
						eq(mediaItems.userId, foundUser.id),
						eq(mediaItems.mediaItemMetadataId, metadataId),
					),
				);

			let mediaItemId: number;
			if (existingMediaItem) {
				mediaItemId = existingMediaItem.id;
			} else {
				// c. Insert mediaItem
				const [insertedItem] = await db
					.insert(mediaItems)
					.values({
						userId: foundUser.id,
						mediaItemMetadataId: metadataId,
						seriesId,
						status,
						isPurchased,
					})
					.returning({ id: mediaItems.id });
				mediaItemId = insertedItem.id;
			}

			// d. Insert mediaItemInstances for each read date
			if (readDates.length > 0) {
				for (let dateIndex = 0; dateIndex < readDates.length; dateIndex++) {
					const isLastInstance = dateIndex === readDates.length - 1;
					await db.insert(mediaItemInstances).values({
						mediaItemId,
						completedAt: readDates[dateIndex],
						rating: isLastInstance && csvScore ? csvScore : null,
					});
					instanceCount++;
				}
			} else if (status === MediaItemStatus.COMPLETED && csvScore) {
				// Completed but no dates — store the rating in a dateless instance
				await db.insert(mediaItemInstances).values({
					mediaItemId,
					completedAt: null,
					rating: csvScore,
				});
				instanceCount++;
			}

			console.log(
				`  [${matchLabel}] "${csvTitle}" (${status})${existingMediaItem ? " — already in library" : ""}`,
			);
			importedCount++;
		}

		// 7. Update series statuses based on their items
		if (!isDryRun) {
			for (const [seriesName, statuses] of seriesItemStatuses.entries()) {
				const currentSeriesId = seriesNameToId.get(seriesName);
				if (!currentSeriesId || statuses.length === 0) {
					continue;
				}
				const computedStatus = computeSeriesStatus(statuses);
				await db
					.update(series)
					.set({ status: computedStatus })
					.where(
						and(
							eq(series.id, currentSeriesId),
							eq(series.userId, foundUser.id),
						),
					);
			}
		}

		// 8. Summary
		console.log("\n--- Import Summary ---");
		console.log(`Books imported:      ${importedCount}`);
		if (hasHardcoverKey) {
			console.log(`  Hardcover matches: ${hardcoverMatchCount}`);
			console.log(`  Custom fallbacks:  ${customFallbackCount}`);
		}
		console.log(`Instances created:   ${instanceCount}`);
		console.log(`Series created:      ${csvSeriesNames.length}`);
		console.log(`Rows skipped:        ${skippedCount}`);
		if (isDryRun) {
			console.log("\n(DRY RUN — nothing was written to the database)");
		} else {
			console.log("\n✅ Import complete!");
		}
	} finally {
		await pool.end();
	}
}

main().catch((error) => {
	console.error("Import failed:", error);
	process.exit(1);
});
