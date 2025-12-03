CREATE TYPE "public"."order_priority" AS ENUM('ROUTINE', 'URGENT', 'STAT');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "tb_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_patient" uuid NOT NULL,
	"id_practitioner" uuid NOT NULL,
	"id_created_by" uuid NOT NULL,
	"id_loinc" uuid NOT NULL,
	"id_modality" uuid NOT NULL,
	"id_encounter_ss" varchar(255),
	"id_service_request_ss" varchar(255),
	"id_observation_ss" varchar(255),
	"id_procedure_ss" varchar(255),
	"accession_number" varchar(255) NOT NULL,
	"order_number" varchar(255) NOT NULL,
	"order_date" timestamp DEFAULT now() NOT NULL,
	"schedule_date" timestamp DEFAULT now() NOT NULL,
	"priority" "order_priority" DEFAULT 'ROUTINE' NOT NULL,
	"status_order" "order_status" DEFAULT 'PENDING' NOT NULL,
	"diagnosis" text,
	"notes" text,
	"require_fasting" boolean DEFAULT false NOT NULL,
	"require_pregnancy_check" boolean DEFAULT false NOT NULL,
	"require_use_contrast" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "tb_order_accession_number_unique" UNIQUE("accession_number")
);
--> statement-breakpoint
ALTER TABLE "tb_order" ADD CONSTRAINT "tb_order_id_patient_tb_patient_id_fk" FOREIGN KEY ("id_patient") REFERENCES "public"."tb_patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_order" ADD CONSTRAINT "tb_order_id_practitioner_tb_practitioner_id_fk" FOREIGN KEY ("id_practitioner") REFERENCES "public"."tb_practitioner"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_order" ADD CONSTRAINT "tb_order_id_created_by_tb_user_id_fk" FOREIGN KEY ("id_created_by") REFERENCES "public"."tb_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_order" ADD CONSTRAINT "tb_order_id_loinc_tb_loinc_id_fk" FOREIGN KEY ("id_loinc") REFERENCES "public"."tb_loinc"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_order" ADD CONSTRAINT "tb_order_id_modality_tb_modality_id_fk" FOREIGN KEY ("id_modality") REFERENCES "public"."tb_modality"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_accession_number_idx" ON "tb_order" USING btree ("accession_number");--> statement-breakpoint
CREATE UNIQUE INDEX "order_order_number_idx" ON "tb_order" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "order_patient_idx" ON "tb_order" USING btree ("id_patient");--> statement-breakpoint
CREATE INDEX "order_practitioner_idx" ON "tb_order" USING btree ("id_practitioner");--> statement-breakpoint
CREATE INDEX "order_status_idx" ON "tb_order" USING btree ("status_order");--> statement-breakpoint
CREATE INDEX "order_order_date_idx" ON "tb_order" USING btree ("order_date");--> statement-breakpoint
CREATE INDEX "order_schedule_date_idx" ON "tb_order" USING btree ("schedule_date");