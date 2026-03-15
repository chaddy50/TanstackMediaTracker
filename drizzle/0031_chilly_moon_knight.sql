CREATE TABLE "custom_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"report_type" text NOT NULL,
	"media_types" text[],
	"month_count" integer DEFAULT 12 NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "active_custom_report_id" integer;--> statement-breakpoint
ALTER TABLE "custom_reports" ADD CONSTRAINT "custom_reports_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_active_custom_report_id_custom_reports_id_fk" FOREIGN KEY ("active_custom_report_id") REFERENCES "public"."custom_reports"("id") ON DELETE set null ON UPDATE no action;