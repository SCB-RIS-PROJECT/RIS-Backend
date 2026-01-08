/**
 * Check is_active column in tb_loinc
 */

import db from "@/database/db";
import { loincTable } from "@/database/schemas/schema-loinc";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Checking is_active column in tb_loinc...\n");

    // Check if column exists
    const columns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'tb_loinc' 
        AND column_name = 'is_active'
    `);

    console.log("Column info:");
    console.log(columns.rows);
    console.log();

    // Check data
    const records = await db.select().from(loincTable).limit(5);

    console.log("Sample records:");
    records.forEach((record, i) => {
        console.log(`${i + 1}. ${record.code} - ${record.name}`);
        console.log(`   is_active: ${record.is_active}`);
        console.log(`   (type: ${typeof record.is_active})`);
    });

    process.exit(0);
}

main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
});
