import { readFileSync } from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.mock("#/database/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});

import { testDb } from "#/tests/integration/db";
import { PRE_COLLAPSE_DDL } from "#/tests/integration/preCollapseSchema";

/**
 * Replays `drizzle/0036_collapse_media_metadata.sql` against a realistic
 * pre-migration state to prove it loses no data.
 *
 * `globalSetup` has already migrated the shared test database through 0036, and
 * `fileParallelism` is false, so sibling suites are querying `public` while this
 * runs. Every case therefore builds the "before" shape in a scratch schema
 * inside a transaction it always rolls back — nothing leaks, and no DDL lock is
 * taken on a `public` table.
 */

const MIGRATION_PATH = path.join(
	process.cwd(),
	"drizzle",
	"0036_collapse_media_metadata.sql",
);

function readMigrationStatements(): string[] {
	return readFileSync(MIGRATION_PATH, "utf8")
		.split("--> statement-breakpoint")
		.map((statement) => statement.trim())
		.filter((statement) => statement.length > 0);
}

class Rollback extends Error {}

type Tx = Parameters<Parameters<typeof testDb.transaction>[0]>[0];

/**
 * Builds the pre-0036 schema in a scratch namespace, runs `seed`, replays the
 * migration, then hands control to `assert`. Always rolls back.
 *
 * `runMigration` is passed to the body rather than called automatically so a
 * case can assert on the migration throwing.
 */
async function withPreMigrationSchema(
	seed: (tx: Tx) => Promise<void>,
	assertions: (tx: Tx, runMigration: () => Promise<void>) => Promise<void>,
): Promise<void> {
	try {
		await testDb.transaction(async (tx) => {
			await tx.execute(sql.raw("CREATE SCHEMA mig_replay"));
			// Scratch schema first so unqualified names resolve there; public second
			// so the media_type / media_item_status / purchase_status enums resolve.
			await tx.execute(sql.raw("SET LOCAL search_path TO mig_replay, public"));
			await tx.execute(sql.raw(PRE_COLLAPSE_DDL));

			await seed(tx);

			const runMigration = async () => {
				for (const statement of readMigrationStatements()) {
					await tx.execute(sql.raw(statement));
				}
			};

			await assertions(tx, runMigration);

			throw new Rollback();
		});
	} catch (error) {
		if (!(error instanceof Rollback)) throw error;
	}
}

async function scalar<T>(tx: Tx, query: string): Promise<T> {
	const result = await tx.execute(sql.raw(query));
	return Object.values(result.rows[0] ?? {})[0] as T;
}

/** A metadata row shared by three users, plus edge-case rows and instances. */
async function seedRealisticLibrary(tx: Tx): Promise<void> {
	await tx.execute(
		sql.raw(`
		INSERT INTO series (user_id, name, type) VALUES ('user_a', 'The Dune Saga', 'movie');
		INSERT INTO creators (user_id, name) VALUES ('user_a', 'Denis Villeneuve');
		INSERT INTO genres (user_id, name) VALUES ('user_a', 'Science Fiction');

		INSERT INTO media_metadata (type, title, description, cover_image_url, release_date, external_id, external_source, metadata)
		VALUES ('movie', 'The Dune', 'Custom description by A', 'http://example.test/a.jpg', '2021-10-22', 'tmdb-438631', 'tmdb',
			'{"director":"Denis Villeneuve","series":"The Dune Saga","runtime":155}');

		INSERT INTO media_metadata (type, title, external_id, external_source, metadata) VALUES
			('book',       'An Ember in the Ashes', 'hc-1', 'hardcover', '{"author":"Sabaa Tahir","series":"An Ember Quartet"}'),
			('book',       'A Game of Thrones',     'hc-2', 'hardcover', '{"author":"George R. R. Martin"}'),
			('book',       'Theodore Boone',        'hc-3', 'hardcover', NULL),
			('video_game', 'Dune II',               'igdb-1', 'igdb',    '{}'),
			('tv_show',    'The Expanse',           'tmdb-63639', 'tmdb', '{"creator":"Mark Fergus","series":"The Expanse"}');

		INSERT INTO media_metadata (type, title, description, external_id, external_source, metadata)
		VALUES ('podcast', 'Hardcore History - 硬派歴史', 'unicode + nested arrays', 'itunes-arc-guids:g1,g2', 'itunes',
			'{"creator":"Dan Carlin","episodeNumbers":[47,48,49],"episodeGuids":["g1","g2"],"totalDuration":540}');

		INSERT INTO media_metadata (type, title, release_date, external_id, external_source, metadata)
		VALUES ('book', 'The Epic of Gilgamesh', '1200-01-01 BC', 'hc-bc', 'hardcover', '{"author":"Unknown"}');

		INSERT INTO media_metadata (type, title, description, external_id, external_source, metadata)
		VALUES ('movie', 'Blank Description', '', 'tmdb-blank', 'tmdb', '{}');

		-- Referenced by no item: unreachable, must not break the migration.
		INSERT INTO media_metadata (type, title, external_id, external_source, metadata)
		VALUES ('movie', 'Orphaned Row', 'tmdb-orphan', 'tmdb', '{"director":"Nobody"}');

		INSERT INTO media_items (user_id, media_item_metadata_id, series_id, creator_id, genre_id, status, purchase_status)
		SELECT 'user_a', m.id,
			(SELECT id FROM series WHERE user_id = 'user_a'),
			(SELECT id FROM creators WHERE user_id = 'user_a'),
			(SELECT id FROM genres WHERE user_id = 'user_a'),
			'in_progress', 'purchased'
		FROM media_metadata m WHERE m.external_id = 'tmdb-438631';

		INSERT INTO media_items (user_id, media_item_metadata_id, status, purchase_status)
		SELECT 'user_a', m.id, 'backlog', 'not_purchased'
		FROM media_metadata m
		WHERE m.external_id IN ('hc-1','hc-2','hc-3','igdb-1','tmdb-63639','itunes-arc-guids:g1,g2','hc-bc','tmdb-blank');

		INSERT INTO media_items (user_id, media_item_metadata_id, status, purchase_status)
		SELECT 'user_b', m.id, 'done', 'want_to_buy'
		FROM media_metadata m WHERE m.external_id = 'tmdb-438631';

		INSERT INTO media_items (user_id, media_item_metadata_id, status, purchase_status)
		SELECT 'user_c', m.id, 'dropped', 'not_purchased'
		FROM media_metadata m WHERE m.external_id = 'tmdb-438631';

		INSERT INTO media_item_instances (media_item_id, rating, review_text, started_at, completed_at)
		SELECT mi.id, 9.5, 'A first watch', '2021-11-01', '2021-11-02' FROM media_items mi
		WHERE mi.user_id = 'user_a' AND mi.media_item_metadata_id = (SELECT id FROM media_metadata WHERE external_id='tmdb-438631');

		INSERT INTO media_item_instances (media_item_id, rating, review_text, started_at, completed_at)
		SELECT mi.id, 8.0, 'A rewatch', '2023-01-01', NULL FROM media_items mi
		WHERE mi.user_id = 'user_a' AND mi.media_item_metadata_id = (SELECT id FROM media_metadata WHERE external_id='tmdb-438631');

		INSERT INTO media_item_instances (media_item_id, rating, review_text, started_at, completed_at)
		SELECT mi.id, 7.0, 'B watch', '2022-05-05', '2022-05-06' FROM media_items mi
		WHERE mi.user_id = 'user_b' AND mi.media_item_metadata_id = (SELECT id FROM media_metadata WHERE external_id='tmdb-438631');
	`),
	);
}

describe("0036 collapse migration — data preservation", () => {
	it("copies all 8 moved columns onto each user's item", async () => {
		await withPreMigrationSchema(seedRealisticLibrary, async (tx, run) => {
			const before = await tx.execute(
				sql.raw(`
				SELECT mi.id, m.type::text, m.title, m.description, m.cover_image_url,
				       m.release_date::text, m.external_id, m.external_source, m.metadata
				FROM media_items mi JOIN media_metadata m ON m.id = mi.media_item_metadata_id
				ORDER BY mi.id
			`),
			);

			await run();

			const after = await tx.execute(
				sql.raw(`
				SELECT id, type::text, title, description, cover_image_url,
				       release_date::text, external_id, external_source, metadata
				FROM media_items ORDER BY id
			`),
			);

			expect(after.rows).toEqual(before.rows);
		});
	});

	it("leaves media_items row count unchanged", async () => {
		await withPreMigrationSchema(seedRealisticLibrary, async (tx, run) => {
			const before = await scalar<string>(
				tx,
				"SELECT count(*) FROM media_items",
			);
			await run();
			const after = await scalar<string>(
				tx,
				"SELECT count(*) FROM media_items",
			);
			expect(after).toBe(before);
		});
	});

	it("leaves instance count and item links unchanged", async () => {
		await withPreMigrationSchema(seedRealisticLibrary, async (tx, run) => {
			const before = await tx.execute(
				sql.raw(
					"SELECT id, media_item_id FROM media_item_instances ORDER BY id",
				),
			);
			await run();
			const after = await tx.execute(
				sql.raw(
					"SELECT id, media_item_id FROM media_item_instances ORDER BY id",
				),
			);
			expect(after.rows).toEqual(before.rows);
		});
	});

	it("gives each user an independent copy of a row shared by three users", async () => {
		await withPreMigrationSchema(seedRealisticLibrary, async (tx, run) => {
			await run();

			const copies = await tx.execute(
				sql.raw(`
				SELECT user_id, title, cover_image_url, status::text
				FROM media_items WHERE external_id = 'tmdb-438631' ORDER BY user_id
			`),
			);
			expect(copies.rows).toHaveLength(3);
			// Same descriptive data, each user's own tracking state.
			expect(copies.rows.map((r) => r.title)).toEqual([
				"The Dune",
				"The Dune",
				"The Dune",
			]);
			expect(copies.rows.map((r) => r.status)).toEqual([
				"in_progress",
				"done",
				"dropped",
			]);

			// Editing one user's copy must not touch the others.
			await tx.execute(
				sql.raw(`
				UPDATE media_items SET title = 'A EDITED THIS'
				WHERE user_id = 'user_a' AND external_id = 'tmdb-438631'
			`),
			);
			const afterEdit = await tx.execute(
				sql.raw(`
				SELECT user_id, title FROM media_items
				WHERE external_id = 'tmdb-438631' ORDER BY user_id
			`),
			);
			expect(afterEdit.rows.map((r) => r.title)).toEqual([
				"A EDITED THIS",
				"The Dune",
				"The Dune",
			]);
		});
	});

	it("drops orphan metadata rows without inventing items", async () => {
		await withPreMigrationSchema(seedRealisticLibrary, async (tx, run) => {
			const before = await scalar<string>(
				tx,
				"SELECT count(*) FROM media_items",
			);
			await run();
			const after = await scalar<string>(
				tx,
				"SELECT count(*) FROM media_items",
			);
			expect(after).toBe(before);

			const orphans = await scalar<string>(
				tx,
				"SELECT count(*) FROM media_items WHERE external_id = 'tmdb-orphan'",
			);
			expect(orphans).toBe("0");
		});
	});

	it("recomputes sort_title with the leading-article rules", async () => {
		await withPreMigrationSchema(seedRealisticLibrary, async (tx, run) => {
			await run();
			const rows = await tx.execute(
				sql.raw("SELECT title, sort_title FROM media_items ORDER BY title"),
			);
			const byTitle = new Map(rows.rows.map((r) => [r.title, r.sort_title]));

			expect(byTitle.get("The Dune")).toBe("Dune");
			expect(byTitle.get("An Ember in the Ashes")).toBe("Ember in the Ashes");
			expect(byTitle.get("A Game of Thrones")).toBe("Game of Thrones");
			expect(byTitle.get("Dune II")).toBe("Dune II");
			// "Theodore" starts with "The" but has no following space — must not strip.
			expect(byTitle.get("Theodore Boone")).toBe("Theodore Boone");
		});
	});

	it("recomputes series_sort_name from metadata->>'series'", async () => {
		await withPreMigrationSchema(seedRealisticLibrary, async (tx, run) => {
			await run();
			const rows = await tx.execute(
				sql.raw(
					"SELECT title, series_sort_name FROM media_items ORDER BY title",
				),
			);
			const byTitle = new Map(
				rows.rows.map((r) => [r.title, r.series_sort_name]),
			);

			expect(byTitle.get("The Dune")).toBe("Dune Saga");
			expect(byTitle.get("An Ember in the Ashes")).toBe("Ember Quartet");
			expect(byTitle.get("The Expanse")).toBe("Expanse");
			// NULL metadata yields a NULL generated column.
			expect(byTitle.get("Theodore Boone")).toBeNull();
		});
	});

	it("leaves title NOT NULL and populated", async () => {
		await withPreMigrationSchema(seedRealisticLibrary, async (tx, run) => {
			await run();

			const nullable = await scalar<string>(
				tx,
				`SELECT is_nullable FROM information_schema.columns
				 WHERE table_schema = 'mig_replay' AND table_name = 'media_items' AND column_name = 'title'`,
			);
			expect(nullable).toBe("NO");

			const blanks = await scalar<string>(
				tx,
				"SELECT count(*) FROM media_items WHERE title IS NULL OR title = ''",
			);
			expect(blanks).toBe("0");
		});
	});

	it("swaps the global unique index for a per-user one", async () => {
		await withPreMigrationSchema(seedRealisticLibrary, async (tx, run) => {
			await run();
			const indexes = await tx.execute(
				sql.raw(
					`SELECT indexname FROM pg_indexes WHERE schemaname = 'mig_replay'`,
				),
			);
			const names = indexes.rows.map((r) => r.indexname);
			expect(names).toContain("media_items_user_external_unique");
			expect(names).not.toContain("media_item_metadata_external_unique");
		});
	});

	it("lets two users hold the same external item afterwards", async () => {
		await withPreMigrationSchema(seedRealisticLibrary, async (tx, run) => {
			await run();
			await expect(
				tx.execute(
					sql.raw(`
					INSERT INTO media_items (user_id, type, title, external_id, external_source)
					VALUES ('user_d', 'movie', 'D copy', 'tmdb-438631', 'tmdb')
				`),
				),
			).resolves.toBeDefined();
		});
	});

	it("stops one user holding the same external item twice", async () => {
		await withPreMigrationSchema(seedRealisticLibrary, async (tx, run) => {
			await run();
			await expect(
				tx.execute(
					sql.raw(`
					INSERT INTO media_items (user_id, type, title, external_id, external_source)
					VALUES ('user_a', 'movie', 'Dupe', 'tmdb-438631', 'tmdb')
				`),
				),
				// Drizzle wraps the driver error, so the SQLSTATE lives on the cause.
			).rejects.toMatchObject({ cause: { code: "23505" } });
		});
	});

	it("drops media_metadata and media_items.media_item_metadata_id", async () => {
		await withPreMigrationSchema(seedRealisticLibrary, async (tx, run) => {
			await run();

			const tableCount = await scalar<string>(
				tx,
				`SELECT count(*) FROM information_schema.tables
				 WHERE table_schema = 'mig_replay' AND table_name = 'media_metadata'`,
			);
			expect(tableCount).toBe("0");

			const columnCount = await scalar<string>(
				tx,
				`SELECT count(*) FROM information_schema.columns
				 WHERE table_schema = 'mig_replay' AND table_name = 'media_items'
				   AND column_name = 'media_item_metadata_id'`,
			);
			expect(columnCount).toBe("0");
		});
	});

	it("preserves NULL and empty-string distinctly", async () => {
		await withPreMigrationSchema(seedRealisticLibrary, async (tx, run) => {
			await run();
			const rows = await tx.execute(
				sql.raw(`
				SELECT title, description IS NULL AS descr_null, description = '' AS descr_blank,
				       metadata IS NULL AS meta_null
				FROM media_items WHERE title IN ('Blank Description', 'Theodore Boone', 'Dune II')
				ORDER BY title
			`),
			);
			const byTitle = new Map(rows.rows.map((r) => [r.title, r]));

			expect(byTitle.get("Blank Description")?.descr_null).toBe(false);
			expect(byTitle.get("Blank Description")?.descr_blank).toBe(true);
			expect(byTitle.get("Theodore Boone")?.descr_null).toBe(true);
			expect(byTitle.get("Theodore Boone")?.meta_null).toBe(true);
			expect(byTitle.get("Dune II")?.meta_null).toBe(false);
		});
	});

	it("preserves BC release dates", async () => {
		await withPreMigrationSchema(seedRealisticLibrary, async (tx, run) => {
			await run();
			const stored = await scalar<string>(
				tx,
				"SELECT release_date::text FROM media_items WHERE external_id = 'hc-bc'",
			);
			expect(stored).toBe("1200-01-01 BC");
		});
	});

	it("leaves the pre-existing media_items columns untouched", async () => {
		await withPreMigrationSchema(seedRealisticLibrary, async (tx, run) => {
			const columns = `id, user_id, series_id, creator_id, genre_id, status::text,
			                 purchase_status::text, expected_release_date::text, created_at, updated_at`;
			const before = await tx.execute(
				sql.raw(`SELECT ${columns} FROM media_items ORDER BY id`),
			);
			await run();
			const after = await tx.execute(
				sql.raw(`SELECT ${columns} FROM media_items ORDER BY id`),
			);
			expect(after.rows).toEqual(before.rows);
		});
	});

	it("preserves all five media types", async () => {
		await withPreMigrationSchema(seedRealisticLibrary, async (tx, run) => {
			await run();
			const rows = await tx.execute(
				sql.raw(
					"SELECT DISTINCT type::text AS type FROM media_items ORDER BY type",
				),
			);
			expect(rows.rows.map((r) => r.type)).toEqual([
				"book",
				"movie",
				"podcast",
				"tv_show",
				"video_game",
			]);
		});
	});

	it("copies unicode titles and nested JSONB byte-for-byte", async () => {
		await withPreMigrationSchema(seedRealisticLibrary, async (tx, run) => {
			await run();
			const row = await tx.execute(
				sql.raw(`
				SELECT title, metadata->'episodeGuids' AS guids, metadata->>'totalDuration' AS duration
				FROM media_items WHERE external_source = 'itunes'
			`),
			);
			expect(row.rows[0]?.title).toBe("Hardcore History - 硬派歴史");
			expect(row.rows[0]?.guids).toEqual(["g1", "g2"]);
			expect(row.rows[0]?.duration).toBe("540");
		});
	});
});

describe("0036 collapse migration — guards", () => {
	it("aborts when one user holds two items against a single metadata row", async () => {
		await withPreMigrationSchema(
			async (tx) => {
				await tx.execute(
					sql.raw(`
					INSERT INTO media_metadata (type, title, external_id, external_source, metadata)
					VALUES ('movie', 'Shared', 'x-1', 'tmdb', '{}');
					INSERT INTO media_items (user_id, media_item_metadata_id, status, purchase_status)
					SELECT 'user_a', id, 'backlog', 'not_purchased' FROM media_metadata WHERE external_id = 'x-1';
					INSERT INTO media_items (user_id, media_item_metadata_id, status, purchase_status)
					SELECT 'user_a', id, 'done', 'purchased' FROM media_metadata WHERE external_id = 'x-1';
				`),
				);
			},
			async (_tx, run) => {
				// The new unique index could not be built over this shape, so the
				// migration must refuse rather than silently drop one of the items.
				await expect(run()).rejects.toThrow(/0036 aborted/);
			},
		);
	});

	it("leaves the database untouched when a guard fires", async () => {
		// A failed statement poisons its transaction, so this case uses its own
		// savepoint: run the migration inside it, let the guard abort, roll the
		// savepoint back, and confirm the pre-migration shape survived.
		await withPreMigrationSchema(
			async (tx) => {
				await tx.execute(
					sql.raw(`
					INSERT INTO media_metadata (type, title, external_id, external_source, metadata)
					VALUES ('movie', 'Shared', 'x-1', 'tmdb', '{}');
					INSERT INTO media_items (user_id, media_item_metadata_id, status, purchase_status)
					SELECT 'user_a', id, 'backlog', 'not_purchased' FROM media_metadata WHERE external_id = 'x-1';
					INSERT INTO media_items (user_id, media_item_metadata_id, status, purchase_status)
					SELECT 'user_a', id, 'done', 'purchased' FROM media_metadata WHERE external_id = 'x-1';
				`),
				);
			},
			async (tx, run) => {
				await tx.execute(sql.raw("SAVEPOINT before_migration"));
				await expect(run()).rejects.toThrow(/0036 aborted/);
				await tx.execute(sql.raw("ROLLBACK TO SAVEPOINT before_migration"));

				const metadataTable = await scalar<string>(
					tx,
					`SELECT count(*) FROM information_schema.tables
					 WHERE table_schema = 'mig_replay' AND table_name = 'media_metadata'`,
				);
				expect(metadataTable).toBe("1");

				const newColumns = await scalar<string>(
					tx,
					`SELECT count(*) FROM information_schema.columns
					 WHERE table_schema = 'mig_replay' AND table_name = 'media_items'
					   AND column_name IN ('title', 'external_id', 'sort_title')`,
				);
				expect(newColumns).toBe("0");

				const fkColumn = await scalar<string>(
					tx,
					`SELECT count(*) FROM information_schema.columns
					 WHERE table_schema = 'mig_replay' AND table_name = 'media_items'
					   AND column_name = 'media_item_metadata_id'`,
				);
				expect(fkColumn).toBe("1");
			},
		);
	});
});
