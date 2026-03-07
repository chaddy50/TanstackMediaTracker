ALTER TABLE "media_items" ADD COLUMN "status_sort_order" integer GENERATED ALWAYS AS (CASE status
				WHEN 'backlog' THEN 0
				WHEN 'next_up' THEN 1
				WHEN 'in_progress' THEN 2
				WHEN 'on_hold' THEN 3
				WHEN 'waiting_for_next_release' THEN 4
				WHEN 'done' THEN 5
				WHEN 'dropped' THEN 6
				ELSE 99
			END) STORED;--> statement-breakpoint
ALTER TABLE "series" ADD COLUMN "status_sort_order" integer GENERATED ALWAYS AS (CASE status
			WHEN 'backlog' THEN 0
			WHEN 'next_up' THEN 1
			WHEN 'in_progress' THEN 2
			WHEN 'on_hold' THEN 3
			WHEN 'waiting_for_next_release' THEN 4
			WHEN 'done' THEN 5
			WHEN 'dropped' THEN 6
			ELSE 99
		END) STORED;