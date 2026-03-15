CREATE TABLE "genres" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_items" ADD COLUMN "genre_id" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "genres_userId_name_unique" ON "genres" USING btree ("user_id","name");--> statement-breakpoint
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE set null ON UPDATE no action;