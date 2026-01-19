#!/usr/bin/env bun
/**
 * Manual migration script to add cara_bayar and study_id columns
 * This script applies the migration 0022 directly to the database
 */

import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:yVmFpwa5oKNXIER2v5btb2rJWRn7JyEOxHDjb11G7C1mWVRiiKxg5ublkojDfsAY@45.80.181.4:5430/postgres";

const migrationSQL = `
ALTER TABLE "tb_detail_order" ADD COLUMN IF NOT EXISTS "study_id" varchar(255);
ALTER TABLE "tb_detail_order" ADD COLUMN IF NOT EXISTS "cara_bayar" varchar(100);
`;

async function runMigration() {
    console.log("🔄 Running migration to add cara_bayar and study_id columns...");

    const pool = new Pool({
        connectionString: DATABASE_URL,
    });

    try {
        // Execute the migration
        const result = await pool.query(migrationSQL);

        console.log("✅ Migration completed successfully!");
        console.log("   - Added column: study_id (varchar 255)");
        console.log("   - Added column: cara_bayar (varchar 100)");
    } catch (error: any) {
        console.error("❌ Migration failed:", error.message);
        console.error("   Error details:", error);
        process.exit(1);
    } finally {
        await pool.end();
        console.log("✅ Database connection closed");
    }
}

runMigration().catch(console.error);
