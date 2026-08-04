CREATE TABLE "view_item_order" (
	"view_id" integer NOT NULL,
	"media_item_id" integer NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "view_item_order_view_id_media_item_id_pk" PRIMARY KEY("view_id","media_item_id")
);
--> statement-breakpoint
ALTER TABLE "view_item_order" ADD CONSTRAINT "view_item_order_view_id_views_id_fk" FOREIGN KEY ("view_id") REFERENCES "public"."views"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "view_item_order" ADD CONSTRAINT "view_item_order_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "view_item_order_viewId_position_idx" ON "view_item_order" USING btree ("view_id","position");