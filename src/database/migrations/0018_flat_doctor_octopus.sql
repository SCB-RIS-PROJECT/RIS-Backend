DROP INDEX "detail_order_service_request_ss_idx";--> statement-breakpoint
DROP INDEX "detail_order_imaging_study_ss_idx";--> statement-breakpoint
DROP INDEX "detail_order_observation_ss_idx";--> statement-breakpoint
DROP INDEX "detail_order_diagnostic_report_ss_idx";--> statement-breakpoint
DROP INDEX "detail_order_procedure_ss_idx";--> statement-breakpoint
DROP INDEX "detail_order_requester_ss_idx";--> statement-breakpoint
DROP INDEX "detail_order_performer_ss_idx";--> statement-breakpoint
DROP INDEX "detail_order_allergy_ss_idx";--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "id_requester" uuid;--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "id_performer" uuid;--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD CONSTRAINT "tb_detail_order_id_requester_tb_practitioner_id_fk" FOREIGN KEY ("id_requester") REFERENCES "public"."tb_practitioner"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD CONSTRAINT "tb_detail_order_id_performer_tb_practitioner_id_fk" FOREIGN KEY ("id_performer") REFERENCES "public"."tb_practitioner"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "detail_order_requester_idx" ON "tb_detail_order" USING btree ("id_requester");--> statement-breakpoint
CREATE INDEX "detail_order_performer_idx" ON "tb_detail_order" USING btree ("id_performer");--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "id_service_request_ss";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "id_imaging_study_ss";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "id_observation_ss";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "id_diagnostic_report_ss";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "id_procedure_ss";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "id_allergy_intolerance_ss";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "id_requester_ss";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "requester_display";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "id_performer_ss";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "performer_display";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "order_date";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "occurrence_datetime";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "fhir_status";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "fhir_intent";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "order_category_code";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "order_category_display";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "reason_code";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "reason_display";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "diagnosis";