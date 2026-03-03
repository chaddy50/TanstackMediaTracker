ALTER TABLE "media_metadata" ADD COLUMN "sort_title" text GENERATED ALWAYS AS (CASE
				WHEN LOWER(title) LIKE 'the %' THEN SUBSTRING(title FROM 5)
				WHEN LOWER(title) LIKE 'an %' THEN SUBSTRING(title FROM 4)
				WHEN LOWER(title) LIKE 'a %' THEN SUBSTRING(title FROM 3)
				ELSE title
			END) STORED;