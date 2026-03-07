CREATE TYPE "public"."next_item_status" AS ENUM('waiting_for_release', 'purchased', 'available');--> statement-breakpoint
ALTER TABLE "series" ADD COLUMN "next_item_status" "next_item_status";