CREATE TABLE "tb_loinc" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_modality" uuid NOT NULL,
	"code" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"loinc_code" varchar(50) NOT NULL,
	"loinc_display" varchar(255) NOT NULL,
	"loinc_system" varchar(255) DEFAULT 'http://loinc.org' NOT NULL,
	"require_fasting" boolean DEFAULT false NOT NULL,
	"require_pregnancy_check" boolean DEFAULT false NOT NULL,
	"require_use_contrast" boolean DEFAULT false NOT NULL,
	"contrast_name" varchar(255),
	"contrast_kfa_code" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "tb_loinc_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "tb_loinc" ADD CONSTRAINT "tb_loinc_id_modality_tb_modality_id_fk" FOREIGN KEY ("id_modality") REFERENCES "public"."tb_modality"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "loinc_code_idx" ON "tb_loinc" USING btree ("code");--> statement-breakpoint
CREATE INDEX "loinc_name_idx" ON "tb_loinc" USING btree ("name");--> statement-breakpoint
CREATE INDEX "loinc_modality_idx" ON "tb_loinc" USING btree ("id_modality");--> statement-breakpoint
CREATE INDEX "loinc_loinc_code_idx" ON "tb_loinc" USING btree ("loinc_code");--> statement-breakpoint
CREATE INDEX "loinc_loinc_display_idx" ON "tb_loinc" USING btree ("loinc_display");