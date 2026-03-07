UPDATE "views"
SET "filters" = jsonb_set(
	"filters",
	'{statuses}',
	(
		SELECT jsonb_agg(
			CASE WHEN elem::text = '"completed"' THEN '"done"'::jsonb ELSE elem END
		)
		FROM jsonb_array_elements("filters"->'statuses') AS elem
	)
)
WHERE "filters"->'statuses' @> '["completed"]';
