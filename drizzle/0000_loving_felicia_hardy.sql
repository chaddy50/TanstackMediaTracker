CREATE TYPE "public"."entry_status" AS ENUM('want_to', 'in_progress', 'completed', 'dropped', 'on_hold');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('book', 'movie', 'tv_show', 'video_game');--> statement-breakpoint
CREATE TABLE "media_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_entry_id" integer NOT NULL,
	"rating" numeric(3, 1),
	"review_text" text,
	"started_at" date,
	"completed_at" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_items" (
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
CREATE TABLE "user_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"media_item_id" integer NOT NULL,
	"status" "entry_status" DEFAULT 'want_to' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_instances" ADD CONSTRAINT "media_instances_user_entry_id_user_entries_id_fk" FOREIGN KEY ("user_entry_id") REFERENCES "public"."user_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_entries" ADD CONSTRAINT "user_entries_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "media_items_external_unique" ON "media_items" USING btree ("external_id","external_source");