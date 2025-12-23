-- Add SIMRS and FHIR fields to tb_order table
ALTER TABLE "tb_order" ADD COLUMN "id_pelayanan" varchar(255);
ALTER TABLE "tb_order" ADD COLUMN "patient_name" varchar(255);
ALTER TABLE "tb_order" ADD COLUMN "patient_mrn" varchar(100);
ALTER TABLE "tb_order" ADD COLUMN "patient_birth_date" date;
ALTER TABLE "tb_order" ADD COLUMN "patient_age" integer;
ALTER TABLE "tb_order" ADD COLUMN "patient_gender" varchar(10);

-- Add FHIR specific fields to tb_detail_order
ALTER TABLE "tb_detail_order" ADD COLUMN "id_requester_ss" varchar(255);
ALTER TABLE "tb_detail_order" ADD COLUMN "requester_display" varchar(255);
ALTER TABLE "tb_detail_order" ADD COLUMN "id_performer_ss" varchar(255);
ALTER TABLE "tb_detail_order" ADD COLUMN "performer_display" varchar(255);
ALTER TABLE "tb_detail_order" ADD COLUMN "order_category_code" varchar(50);
ALTER TABLE "tb_detail_order" ADD COLUMN "order_category_display" varchar(255);
ALTER TABLE "tb_detail_order" ADD COLUMN "loinc_code_alt" varchar(50);
ALTER TABLE "tb_detail_order" ADD COLUMN "loinc_display_alt" varchar(255);
ALTER TABLE "tb_detail_order" ADD COLUMN "kptl_code" varchar(100);
ALTER TABLE "tb_detail_order" ADD COLUMN "kptl_display" varchar(255);
ALTER TABLE "tb_detail_order" ADD COLUMN "modality_code" varchar(50);
ALTER TABLE "tb_detail_order" ADD COLUMN "ae_title" varchar(50);
ALTER TABLE "tb_detail_order" ADD COLUMN "contrast_code" varchar(100);
ALTER TABLE "tb_detail_order" ADD COLUMN "contrast_name_kfa" varchar(255);
ALTER TABLE "tb_detail_order" ADD COLUMN "reason_code" varchar(50);
ALTER TABLE "tb_detail_order" ADD COLUMN "reason_display" varchar(255);
ALTER TABLE "tb_detail_order" ADD COLUMN "occurrence_datetime" timestamp;
ALTER TABLE "tb_detail_order" ADD COLUMN "id_allergy_intolerance_ss" varchar(255);
ALTER TABLE "tb_detail_order" ADD COLUMN "fhir_status" varchar(50) DEFAULT 'active';
ALTER TABLE "tb_detail_order" ADD COLUMN "fhir_intent" varchar(50) DEFAULT 'original-order';

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS "order_pelayanan_idx" ON "tb_order" ("id_pelayanan");
CREATE INDEX IF NOT EXISTS "detail_order_requester_ss_idx" ON "tb_detail_order" ("id_requester_ss");
CREATE INDEX IF NOT EXISTS "detail_order_performer_ss_idx" ON "tb_detail_order" ("id_performer_ss");
CREATE INDEX IF NOT EXISTS "detail_order_allergy_ss_idx" ON "tb_detail_order" ("id_allergy_intolerance_ss");
