CREATE TYPE "public"."purchase_status" AS ENUM('not_purchased', 'want_to_buy', 'purchased');--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN "purchase_status" "purchase_status" DEFAULT 'not_purchased' NOT NULL;--> statement-breakpoint
UPDATE "media_items" SET "purchase_status" = 'purchased' WHERE "is_purchased" = true;--> statement-breakpoint
ALTER TABLE "media_items" DROP COLUMN "is_purchased";