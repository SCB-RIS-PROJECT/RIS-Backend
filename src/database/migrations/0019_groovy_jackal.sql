ALTER TABLE "tb_loinc" ALTER COLUMN "id_modality" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_loinc" ALTER COLUMN "code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_loinc" ALTER COLUMN "loinc_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_loinc" ALTER COLUMN "loinc_display" DROP NOT NULL;