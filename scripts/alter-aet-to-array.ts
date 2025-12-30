import { sql } from "drizzle-orm";
import db from "@/database/db";

async function alterAetToArray() {
    try {
        console.log("🔄 Altering aet column to array...");

        // Drop kolom aet yang lama
        await db.execute(sql`ALTER TABLE tb_modality DROP COLUMN IF EXISTS aet`);
        console.log("✅ Dropped old aet column");

        // Tambahkan kolom aet sebagai array
        await db.execute(sql`ALTER TABLE tb_modality ADD COLUMN aet text[]`);
        console.log("✅ Added new aet column as array");

        console.log("🎉 Successfully altered aet column!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to alter aet column:", error);
        process.exit(1);
    }
}

alterAetToArray();
