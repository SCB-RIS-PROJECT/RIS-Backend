import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import env from "@/config/env";

const pool = new Pool({
    connectionString: env.DATABASE_URL,
});

const db = drizzle(pool);

async function addTipePelayananColumn() {
    try {
        console.log("Adding tipe_pelayanan column to tb_detail_order...");

        await pool.query(`
            ALTER TABLE tb_detail_order 
            ADD COLUMN IF NOT EXISTS tipe_pelayanan varchar(100);
        `);

        console.log("✅ Column tipe_pelayanan added successfully!");
    } catch (error) {
        console.error("❌ Error adding column:", error);
    } finally {
        await pool.end();
    }
}

addTipePelayananColumn();
