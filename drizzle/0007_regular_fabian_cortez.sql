ALTER TABLE "media_items" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "media_items" ALTER COLUMN "status" SET DEFAULT 'backlog'::text;--> statement-breakpoint
ALTER TABLE "series" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "series" ALTER COLUMN "status" SET DEFAULT 'backlog'::text;--> statement-breakpoint
DROP TYPE "public"."media_item_status";--> statement-breakpoint
CREATE TYPE "public"."media_item_status" AS ENUM('backlog', 'next_up', 'in_progress', 'on_hold', 'waiting_for_release', 'completed', 'dropped');--> statement-breakpoint
ALTER TABLE "media_items" ALTER COLUMN "status" SET DEFAULT 'backlog'::"public"."media_item_status";--> statement-breakpoint
ALTER TABLE "media_items" ALTER COLUMN "status" SET DATA TYPE "public"."media_item_status" USING "status"::"public"."media_item_status";--> statement-breakpoint
ALTER TABLE "series" ALTER COLUMN "status" SET DEFAULT 'backlog'::"public"."media_item_status";--> statement-breakpoint
ALTER TABLE "series" ALTER COLUMN "status" SET DATA TYPE "public"."media_item_status" USING "status"::"public"."media_item_status";