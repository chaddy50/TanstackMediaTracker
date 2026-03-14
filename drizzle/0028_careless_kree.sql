ALTER TABLE "series" ADD COLUMN "next_item_status_sort_order" integer GENERATED ALWAYS AS (CASE next_item_status
			WHEN 'purchased' THEN 0
			WHEN 'available' THEN 1
			WHEN 'waiting_for_release' THEN 2
			ELSE 99
		END) STORED;