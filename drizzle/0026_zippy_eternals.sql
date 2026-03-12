CREATE TABLE "creators" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"biography" text,
	"sort_name" text GENERATED ALWAYS AS (REGEXP_REPLACE(name, '^.* ', '')) STORED,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN "creator_id" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "creators_userId_name_unique" ON "creators" USING btree ("user_id","name");--> statement-breakpoint
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE set null ON UPDATE no action;