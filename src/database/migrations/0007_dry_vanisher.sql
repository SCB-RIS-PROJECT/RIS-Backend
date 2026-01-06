ALTER TABLE "tb_detail_order" ALTER COLUMN "order_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tb_detail_order" ALTER COLUMN "order_status" SET DEFAULT 'IN_REQUEST'::text;--> statement-breakpoint
DROP TYPE "public"."order_status";--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('IN_REQUEST', 'IN_QUEUE', 'IN_PROGRESS', 'FINAL');--> statement-breakpoint
ALTER TABLE "tb_detail_order" ALTER COLUMN "order_status" SET DEFAULT 'IN_REQUEST'::"public"."order_status";--> statement-breakpoint
ALTER TABLE "tb_detail_order" ALTER COLUMN "order_status" SET DATA TYPE "public"."order_status" USING "order_status"::"public"."order_status";--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "id_allergy_intolerance_ss" varchar(255);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "id_requester_ss" varchar(255);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "requester_display" varchar(255);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "id_performer_ss" varchar(255);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "performer_display" varchar(255);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "occurrence_datetime" timestamp;--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "fhir_status" varchar(50) DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "fhir_intent" varchar(50) DEFAULT 'original-order';--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "order_category_code" varchar(50);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "order_category_display" varchar(255);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "loinc_code_alt" varchar(50);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "loinc_display_alt" varchar(255);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "kptl_code" varchar(100);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "kptl_display" varchar(255);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "code_text" varchar(255);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "modality_code" varchar(50);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "ae_title" varchar(50);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "contrast_code" varchar(100);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "contrast_name_kfa" varchar(255);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "reason_code" varchar(50);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "reason_display" varchar(255);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "diagnosis_code" varchar(50);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "diagnosis_display" varchar(255);--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "service_request_json" jsonb;--> statement-breakpoint
ALTER TABLE "tb_order" ADD COLUMN "id_pelayanan" varchar(255);--> statement-breakpoint
ALTER TABLE "tb_order" ADD COLUMN "patient_name" varchar(255);--> statement-breakpoint
ALTER TABLE "tb_order" ADD COLUMN "patient_mrn" varchar(100);--> statement-breakpoint
ALTER TABLE "tb_order" ADD COLUMN "patient_birth_date" date;--> statement-breakpoint
ALTER TABLE "tb_order" ADD COLUMN "patient_age" integer;--> statement-breakpoint
ALTER TABLE "tb_order" ADD COLUMN "patient_gender" varchar(10);--> statement-breakpoint
CREATE INDEX "detail_order_requester_ss_idx" ON "tb_detail_order" USING btree ("id_requester_ss");--> statement-breakpoint
CREATE INDEX "detail_order_performer_ss_idx" ON "tb_detail_order" USING btree ("id_performer_ss");--> statement-breakpoint
CREATE INDEX "detail_order_allergy_ss_idx" ON "tb_detail_order" USING btree ("id_allergy_intolerance_ss");--> statement-breakpoint
CREATE INDEX "order_pelayanan_idx" ON "tb_order" USING btree ("id_pelayanan");