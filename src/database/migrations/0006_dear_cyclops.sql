CREATE TYPE "public"."order_from" AS ENUM('INTERNAL', 'EXTERNAL');--> statement-breakpoint
CREATE TABLE "tb_detail_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_order" uuid,
	"id_loinc" uuid,
	"id_service_request_ss" varchar(255),
	"id_observation_ss" varchar(255),
	"id_procedure_ss" varchar(255),
	"accession_number" varchar(255),
	"order_number" varchar(255),
	"order_date" timestamp DEFAULT now(),
	"schedule_date" timestamp DEFAULT now(),
	"order_priority" "order_priority" DEFAULT 'ROUTINE',
	"order_status" "order_status" DEFAULT 'PENDING',
	"order_from" "order_from" DEFAULT 'INTERNAL',
	"diagnosis" text,
	"notes" text,
	"require_fasting" boolean DEFAULT false,
	"require_pregnancy_check" boolean DEFAULT false,
	"require_use_contrast" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "tb_detail_order_accession_number_unique" UNIQUE("accession_number")
);
--> statement-breakpoint
ALTER TABLE "tb_order" DROP CONSTRAINT "tb_order_accession_number_unique";--> statement-breakpoint
ALTER TABLE "tb_order" DROP CONSTRAINT "tb_order_id_loinc_tb_loinc_id_fk";
--> statement-breakpoint
ALTER TABLE "tb_order" DROP CONSTRAINT "tb_order_id_modality_tb_modality_id_fk";
--> statement-breakpoint
DROP INDEX "order_accession_number_idx";--> statement-breakpoint
DROP INDEX "order_order_number_idx";--> statement-breakpoint
DROP INDEX "order_status_idx";--> statement-breakpoint
DROP INDEX "order_order_date_idx";--> statement-breakpoint
DROP INDEX "order_schedule_date_idx";--> statement-breakpoint
ALTER TABLE "tb_order" ALTER COLUMN "id_patient" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_order" ALTER COLUMN "id_practitioner" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_order" ALTER COLUMN "id_created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_order" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD CONSTRAINT "tb_detail_order_id_order_tb_order_id_fk" FOREIGN KEY ("id_order") REFERENCES "public"."tb_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD CONSTRAINT "tb_detail_order_id_loinc_tb_loinc_id_fk" FOREIGN KEY ("id_loinc") REFERENCES "public"."tb_loinc"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "detail_order_order_idx" ON "tb_detail_order" USING btree ("id_order");--> statement-breakpoint
CREATE INDEX "detail_order_loinc_idx" ON "tb_detail_order" USING btree ("id_loinc");--> statement-breakpoint
CREATE INDEX "detail_order_order_number_idx" ON "tb_detail_order" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "detail_order_accession_number_idx" ON "tb_detail_order" USING btree ("accession_number");--> statement-breakpoint
CREATE INDEX "detail_order_order_status_idx" ON "tb_detail_order" USING btree ("order_status");--> statement-breakpoint
CREATE INDEX "detail_order_service_request_ss_idx" ON "tb_detail_order" USING btree ("id_service_request_ss");--> statement-breakpoint
CREATE INDEX "detail_order_observation_ss_idx" ON "tb_detail_order" USING btree ("id_observation_ss");--> statement-breakpoint
CREATE INDEX "detail_order_procedure_ss_idx" ON "tb_detail_order" USING btree ("id_procedure_ss");--> statement-breakpoint
CREATE INDEX "order_created_by_idx" ON "tb_order" USING btree ("id_created_by");--> statement-breakpoint
CREATE INDEX "order_encounter_idx" ON "tb_order" USING btree ("id_encounter_ss");--> statement-breakpoint
ALTER TABLE "tb_order" DROP COLUMN "id_loinc";--> statement-breakpoint
ALTER TABLE "tb_order" DROP COLUMN "id_modality";--> statement-breakpoint
ALTER TABLE "tb_order" DROP COLUMN "id_service_request_ss";--> statement-breakpoint
ALTER TABLE "tb_order" DROP COLUMN "id_observation_ss";--> statement-breakpoint
ALTER TABLE "tb_order" DROP COLUMN "id_procedure_ss";--> statement-breakpoint
ALTER TABLE "tb_order" DROP COLUMN "accession_number";--> statement-breakpoint
ALTER TABLE "tb_order" DROP COLUMN "order_number";--> statement-breakpoint
ALTER TABLE "tb_order" DROP COLUMN "order_date";--> statement-breakpoint
ALTER TABLE "tb_order" DROP COLUMN "schedule_date";--> statement-breakpoint
ALTER TABLE "tb_order" DROP COLUMN "priority";--> statement-breakpoint
ALTER TABLE "tb_order" DROP COLUMN "status_order";--> statement-breakpoint
ALTER TABLE "tb_order" DROP COLUMN "diagnosis";--> statement-breakpoint
ALTER TABLE "tb_order" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "tb_order" DROP COLUMN "require_fasting";--> statement-breakpoint
ALTER TABLE "tb_order" DROP COLUMN "require_pregnancy_check";--> statement-breakpoint
ALTER TABLE "tb_order" DROP COLUMN "require_use_contrast";