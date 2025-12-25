#!/usr/bin/env bun
// biome-ignore-all lint/suspicious/noConsole: <script>

import { sql } from "drizzle-orm";
import db from "@/database/db";

async function runMigration() {
    try {
        console.log("🚀 Running migration: Make id_loinc nullable...");

        // Make id_loinc nullable
        await db.execute(sql`
            ALTER TABLE "tb_detail_order" 
            ALTER COLUMN "id_loinc" DROP NOT NULL;
        `);

        console.log("✅ Migration completed successfully");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

runMigration();
