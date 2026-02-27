ALTER TABLE "series" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "series" ADD COLUMN "is_complete" boolean DEFAULT false NOT NULL;