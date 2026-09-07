CREATE TABLE "view_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_collapsed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "views" ADD COLUMN "group_id" integer;--> statement-breakpoint
ALTER TABLE "views" ADD CONSTRAINT "views_group_id_view_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."view_groups"("id") ON DELETE set null ON UPDATE no action;