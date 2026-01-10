-- Migration: Add id_modality back to tb_detail_order
-- Safe migration: Only ADDs column, no data loss
-- Purpose: Allow detail_order to have direct relation to modality (for MWL push)

-- Add id_modality column (nullable first to allow existing rows)
ALTER TABLE "tb_detail_order" ADD COLUMN "id_modality" uuid;--> statement-breakpoint

-- Add foreign key constraint to tb_modality
ALTER TABLE "tb_detail_order" 
    ADD CONSTRAINT "tb_detail_order_id_modality_tb_modality_id_fk" 
    FOREIGN KEY ("id_modality") 
    REFERENCES "tb_modality"("id") 
    ON DELETE set null 
    ON UPDATE no action;--> statement-breakpoint

-- Create index for performance
CREATE INDEX IF NOT EXISTS "detail_order_modality_idx" ON "tb_detail_order" USING btree ("id_modality");--> statement-breakpoint

-- Populate id_modality from tb_loinc relation for existing orders
-- This ensures existing data gets the modality info
UPDATE "tb_detail_order" 
SET "id_modality" = l."id_modality"
FROM "tb_loinc" l
WHERE "tb_detail_order"."id_loinc" = l."id"
  AND "tb_detail_order"."id_modality" IS NULL
  AND l."id_modality" IS NOT NULL;--> statement-breakpoint

-- Add comment for documentation
COMMENT ON COLUMN "tb_detail_order"."id_modality" IS 'Direct reference to modality, populated from LOINC or can be set manually. Used for MWL push and DICOM operations.';
