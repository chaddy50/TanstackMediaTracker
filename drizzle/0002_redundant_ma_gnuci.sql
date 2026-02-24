CREATE TABLE "series" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "media_type" NOT NULL,
	"status" "media_item_status" DEFAULT 'backlog' NOT NULL,
	"rating" numeric(3, 1),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN "series_id" integer;--> statement-breakpoint
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE set null ON UPDATE no action;