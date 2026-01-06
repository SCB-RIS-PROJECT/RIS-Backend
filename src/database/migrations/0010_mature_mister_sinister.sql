ALTER TABLE "tb_detail_order" ADD COLUMN "id_imaging_study_ss" varchar(255);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "id_diagnostic_report_ss" varchar(255);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "observation_notes" text;--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "diagnostic_conclusion" text;--> statement-breakpoint
CREATE INDEX "detail_order_imaging_study_ss_idx" ON "tb_detail_order" USING btree ("id_imaging_study_ss");--> statement-breakpoint
CREATE INDEX "detail_order_diagnostic_report_ss_idx" ON "tb_detail_order" USING btree ("id_diagnostic_report_ss");