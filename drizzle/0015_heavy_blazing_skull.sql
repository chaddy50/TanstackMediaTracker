CREATE INDEX "media_item_instances_mediaItemId_idx" ON "media_item_instances" USING btree ("media_item_id");--> statement-breakpoint
CREATE INDEX "media_items_userId_updatedAt_idx" ON "media_items" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "media_items_userId_status_idx" ON "media_items" USING btree ("user_id","status");