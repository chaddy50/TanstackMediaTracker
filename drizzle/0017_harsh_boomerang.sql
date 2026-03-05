CREATE TABLE "media_item_tags" (
	"media_item_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "media_item_tags_media_item_id_tag_id_pk" PRIMARY KEY("media_item_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_item_tags" ADD CONSTRAINT "media_item_tags_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_item_tags" ADD CONSTRAINT "media_item_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tags_userId_name_unique" ON "tags" USING btree ("user_id","name");