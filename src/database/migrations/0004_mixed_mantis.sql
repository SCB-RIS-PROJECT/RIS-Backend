ALTER TYPE "public"."role" RENAME TO "profession";--> statement-breakpoint
CREATE TABLE "tb_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_patient" uuid NOT NULL,
	"id_practitioner" uuid,
	"id_encounter" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "tb_practitioner" RENAME COLUMN "role" TO "profession";--> statement-breakpoint
DROP INDEX "practitioner_role_idx";--> statement-breakpoint
ALTER TABLE "tb_order" ADD CONSTRAINT "tb_order_id_patient_tb_patient_id_fk" FOREIGN KEY ("id_patient") REFERENCES "public"."tb_patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_order" ADD CONSTRAINT "tb_order_id_practitioner_tb_practitioner_id_fk" FOREIGN KEY ("id_practitioner") REFERENCES "public"."tb_practitioner"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "practitioner_profession_idx" ON "tb_practitioner" USING btree ("profession");