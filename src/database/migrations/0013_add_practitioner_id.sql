-- Migration: Add practitioner_id to tb_user
-- Safe migration that handles both cases:
-- 1. Fresh database (no practitioner_id column)
-- 2. Database with profile_id (needs rename)
-- 3. Database already has practitioner_id (skip)

-- Drop tb_profile if exists (cleanup from old schema)
DROP TABLE IF EXISTS "tb_profile" CASCADE;--> statement-breakpoint

-- Add practitioner_id column if not exists
DO $$ 
BEGIN
    -- Check if practitioner_id already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tb_user' AND column_name = 'practitioner_id'
    ) THEN
        -- Check if we need to rename from profile_id
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tb_user' AND column_name = 'profile_id'
        ) THEN
            -- Drop old constraint if exists
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'tb_user_profile_id_tb_profile_id_fk'
            ) THEN
                ALTER TABLE "tb_user" DROP CONSTRAINT "tb_user_profile_id_tb_profile_id_fk";
            END IF;
            -- Drop old index if exists
            DROP INDEX IF EXISTS "user_profile_idx";
            -- Rename column
            ALTER TABLE "tb_user" RENAME COLUMN "profile_id" TO "practitioner_id";
        ELSE
            -- Add new column
            ALTER TABLE "tb_user" ADD COLUMN "practitioner_id" uuid;
        END IF;
    END IF;
END $$;--> statement-breakpoint

-- Add foreign key constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tb_user_practitioner_id_tb_practitioner_id_fk'
    ) THEN
        ALTER TABLE "tb_user" ADD CONSTRAINT "tb_user_practitioner_id_tb_practitioner_id_fk" 
            FOREIGN KEY ("practitioner_id") REFERENCES "public"."tb_practitioner"("id") 
            ON DELETE set null ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint

-- Create index if not exists
CREATE INDEX IF NOT EXISTS "user_practitioner_idx" ON "tb_user" USING btree ("practitioner_id");--> statement-breakpoint

-- Cleanup: Drop id_modality from tb_detail_order if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tb_detail_order' AND column_name = 'id_modality'
    ) THEN
        -- Drop constraint if exists
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'tb_detail_order_id_modality_tb_modality_id_fk'
        ) THEN
            ALTER TABLE "tb_detail_order" DROP CONSTRAINT "tb_detail_order_id_modality_tb_modality_id_fk";
        END IF;
        -- Drop index if exists
        DROP INDEX IF EXISTS "detail_order_modality_idx";
        -- Drop column
        ALTER TABLE "tb_detail_order" DROP COLUMN "id_modality";
    END IF;
END $$;