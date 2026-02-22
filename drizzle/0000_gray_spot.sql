CREATE TYPE "public"."media_item_status" AS ENUM('backlog', 'in_progress', 'completed', 'dropped', 'on_hold');--> statement-breakpoint
CREATE TABLE "media_item_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"media_item_id" integer NOT NULL,
	"rating" numeric(3, 1),
	"review_text" text,
	"started_at" date,
	"completed_at" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "media_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"cover_image_url" text,
	"release_date" date,
	"external_id" text NOT NULL,
	"external_source" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"media_item_metadata_id" integer NOT NULL,
	"status" "entry_status" DEFAULT 'backlog' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_item_instances" ADD CONSTRAINT "media_item_instances_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_media_item_metadata_id_media_metadata_id_fk" FOREIGN KEY ("media_item_metadata_id") REFERENCES "public"."media_metadata"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "media_item_metadata_external_unique" ON "media_metadata" USING btree ("external_id","external_source");