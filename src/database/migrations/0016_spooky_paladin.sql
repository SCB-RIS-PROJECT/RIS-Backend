ALTER TABLE "tb_loinc" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_detail_order" ADD COLUMN "pacs_study_url" varchar(500);--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "loinc_code_alt";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "loinc_display_alt";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "kptl_code";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "kptl_display";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "code_text";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "modality_code";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "contrast_code";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "contrast_name_kfa";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "require_fasting";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "require_pregnancy_check";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "require_use_contrast";