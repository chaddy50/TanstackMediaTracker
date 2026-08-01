/**
 * The pre-0036 shape of the tables migration 0036 rewrites — `media_metadata` as
 * a shared table with a global unique index, and `media_items` pointing into it
 * by FK.
 *
 * Used only by the 0036 migration suite, which rebuilds this shape in a scratch
 * schema so the migration can be replayed against a realistic "before" state.
 * The enum types (`media_type`, `media_item_status`, `purchase_status`) are NOT
 * recreated here — they live in `public` and resolve through the search_path.
 */
export const PRE_COLLAPSE_DDL = `
CREATE TABLE media_metadata (
	id serial PRIMARY KEY,
	type media_type NOT NULL,
	title text NOT NULL,
	description text,
	cover_image_url text,
	release_date date,
	external_id text NOT NULL,
	external_source text NOT NULL,
	metadata jsonb,
	sort_title text GENERATED ALWAYS AS (CASE
		WHEN LOWER(title) LIKE 'the %' THEN SUBSTRING(title FROM 5)
		WHEN LOWER(title) LIKE 'an %' THEN SUBSTRING(title FROM 4)
		WHEN LOWER(title) LIKE 'a %' THEN SUBSTRING(title FROM 3)
		ELSE title
	END) STORED,
	series_sort_name text GENERATED ALWAYS AS (CASE
		WHEN LOWER(metadata->>'series') LIKE 'the %' THEN SUBSTRING(metadata->>'series' FROM 5)
		WHEN LOWER(metadata->>'series') LIKE 'an %' THEN SUBSTRING(metadata->>'series' FROM 4)
		WHEN LOWER(metadata->>'series') LIKE 'a %' THEN SUBSTRING(metadata->>'series' FROM 3)
		ELSE metadata->>'series'
	END) STORED,
	created_at timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX media_item_metadata_external_unique
	ON media_metadata (external_id, external_source);

CREATE TABLE series (
	id serial PRIMARY KEY,
	user_id text NOT NULL,
	name text NOT NULL,
	type media_type NOT NULL,
	status media_item_status DEFAULT 'backlog' NOT NULL,
	rating numeric(3,1),
	description text,
	is_complete boolean DEFAULT false NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE creators (
	id serial PRIMARY KEY,
	user_id text NOT NULL,
	name text NOT NULL,
	biography text,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE genres (
	id serial PRIMARY KEY,
	user_id text NOT NULL,
	name text NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE media_items (
	id serial PRIMARY KEY,
	user_id text NOT NULL,
	media_item_metadata_id integer NOT NULL
		REFERENCES media_metadata(id) ON DELETE CASCADE,
	series_id integer REFERENCES series(id) ON DELETE SET NULL,
	creator_id integer REFERENCES creators(id) ON DELETE SET NULL,
	genre_id integer REFERENCES genres(id) ON DELETE SET NULL,
	status media_item_status DEFAULT 'backlog' NOT NULL,
	status_sort_order integer GENERATED ALWAYS AS (CASE status
		WHEN 'backlog' THEN 0
		WHEN 'next_up' THEN 1
		WHEN 'in_progress' THEN 2
		WHEN 'on_hold' THEN 3
		WHEN 'waiting_for_next_release' THEN 4
		WHEN 'done' THEN 5
		WHEN 'dropped' THEN 6
		ELSE 99
	END) STORED,
	purchase_status purchase_status DEFAULT 'not_purchased' NOT NULL,
	expected_release_date date,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE media_item_instances (
	id serial PRIMARY KEY,
	media_item_id integer NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
	rating numeric(3,1),
	fiction_rating jsonb,
	season_reviews jsonb,
	consumption_info jsonb,
	review_text text,
	started_at date,
	completed_at date,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL
);
`;
