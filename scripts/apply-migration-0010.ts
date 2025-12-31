/**
 * Manual Migration 0010
 * Adds diagnostic report fields to tb_detail_order table
 * 
 * Run this with: bun run scripts/apply-migration-0010.ts
 */

import { sql } from "drizzle-orm";
import db from "@/database/db";

async function applyMigration() {
    console.log("🚀 Applying migration 0010...");

    try {
        // 1. Add id_imaging_study_ss column if not exists
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='tb_detail_order' AND column_name='id_imaging_study_ss'
                ) THEN
                    ALTER TABLE "tb_detail_order" ADD COLUMN "id_imaging_study_ss" varchar(255);
                    RAISE NOTICE 'Added column id_imaging_study_ss';
                ELSE
                    RAISE NOTICE 'Column id_imaging_study_ss already exists';
                END IF;
            END $$;
        `);

        // 2. Add id_diagnostic_report_ss column if not exists
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='tb_detail_order' AND column_name='id_diagnostic_report_ss'
                ) THEN
                    ALTER TABLE "tb_detail_order" ADD COLUMN "id_diagnostic_report_ss" varchar(255);
                    RAISE NOTICE 'Added column id_diagnostic_report_ss';
                ELSE
                    RAISE NOTICE 'Column id_diagnostic_report_ss already exists';
                END IF;
            END $$;
        `);

        // 3. Add observation_notes column if not exists
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='tb_detail_order' AND column_name='observation_notes'
                ) THEN
                    ALTER TABLE "tb_detail_order" ADD COLUMN "observation_notes" text;
                    RAISE NOTICE 'Added column observation_notes';
                ELSE
                    RAISE NOTICE 'Column observation_notes already exists';
                END IF;
            END $$;
        `);

        // 4. Add diagnostic_conclusion column if not exists
        await db.execute(sql`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='tb_detail_order' AND column_name='diagnostic_conclusion'
                ) THEN
                    ALTER TABLE "tb_detail_order" ADD COLUMN "diagnostic_conclusion" text;
                    RAISE NOTICE 'Added column diagnostic_conclusion';
                ELSE
                    RAISE NOTICE 'Column diagnostic_conclusion already exists';
                END IF;
            END $$;
        `);

        // 5. Create index for id_imaging_study_ss if not exists
        await db.execute(sql`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_indexes 
                    WHERE tablename='tb_detail_order' AND indexname='detail_order_imaging_study_ss_idx'
                ) THEN
                    CREATE INDEX "detail_order_imaging_study_ss_idx" ON "tb_detail_order" USING btree ("id_imaging_study_ss");
                    RAISE NOTICE 'Created index detail_order_imaging_study_ss_idx';
                ELSE
                    RAISE NOTICE 'Index detail_order_imaging_study_ss_idx already exists';
                END IF;
            END $$;
        `);

        // 6. Create index for id_diagnostic_report_ss if not exists
        await db.execute(sql`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_indexes 
                    WHERE tablename='tb_detail_order' AND indexname='detail_order_diagnostic_report_ss_idx'
                ) THEN
                    CREATE INDEX "detail_order_diagnostic_report_ss_idx" ON "tb_detail_order" USING btree ("id_diagnostic_report_ss");
                    RAISE NOTICE 'Created index detail_order_diagnostic_report_ss_idx';
                ELSE
                    RAISE NOTICE 'Index detail_order_diagnostic_report_ss_idx already exists';
                END IF;
            END $$;
        `);

        console.log("✅ Migration 0010 applied successfully!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Migration failed:");
        console.error(error);
        process.exit(1);
    }
}

applyMigration();
