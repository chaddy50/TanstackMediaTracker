ALTER TABLE "media_metadata" ADD COLUMN "series_sort_name" text GENERATED ALWAYS AS (CASE
				WHEN LOWER(metadata->>'series') LIKE 'the %' THEN SUBSTRING(metadata->>'series' FROM 5)
				WHEN LOWER(metadata->>'series') LIKE 'an %' THEN SUBSTRING(metadata->>'series' FROM 4)
				WHEN LOWER(metadata->>'series') LIKE 'a %' THEN SUBSTRING(metadata->>'series' FROM 3)
				ELSE metadata->>'series'
			END) STORED;