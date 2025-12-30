/**
 * Script untuk migrasi order_status enum dari nilai lama ke nilai baru
 * 
 * Old values: PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
 * New values: IN_REQUEST, IN_QUEUE, IN_PROGRESS, FINAL
 */

import db from "@/database/db";
import { sql } from "drizzle-orm";

async function migrateOrderStatus() {
    console.log("=== Migrasi Order Status Enum ===\n");

    try {
        // Step 1: Cek apakah ada data dengan status lama
        console.log("Step 1: Checking existing data...");
        const existingData = await db.execute(sql`
            SELECT order_status, COUNT(*) as count 
            FROM tb_detail_order 
            GROUP BY order_status
        `);
        console.log("Current status distribution:", existingData.rows);

        // Step 2: Rename old enum
        console.log("\nStep 2: Renaming old enum type...");
        await db.execute(sql`ALTER TYPE "order_status" RENAME TO "order_status_old"`);
        console.log("✓ Old enum renamed to order_status_old");

        // Step 3: Create new enum
        console.log("\nStep 3: Creating new enum type...");
        await db.execute(sql`
            CREATE TYPE "order_status" AS ENUM ('IN_REQUEST', 'IN_QUEUE', 'IN_PROGRESS', 'FINAL')
        `);
        console.log("✓ New enum created");

        // Step 4: Update column to use new enum with mapping
        console.log("\nStep 4: Updating column with data mapping...");
        
        // Drop default first
        await db.execute(sql`
            ALTER TABLE "tb_detail_order" ALTER COLUMN "order_status" DROP DEFAULT
        `);
        
        // Convert column with mapping
        await db.execute(sql`
            ALTER TABLE "tb_detail_order" 
            ALTER COLUMN "order_status" TYPE "order_status" 
            USING (
                CASE "order_status"::text
                    WHEN 'PENDING' THEN 'IN_REQUEST'
                    WHEN 'CONFIRMED' THEN 'IN_QUEUE'
                    WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'
                    WHEN 'COMPLETED' THEN 'FINAL'
                    WHEN 'CANCELLED' THEN 'IN_REQUEST'
                    ELSE 'IN_REQUEST'
                END
            )::"order_status"
        `);
        console.log("✓ Column updated with new values");

        // Step 5: Set new default
        console.log("\nStep 5: Setting new default value...");
        await db.execute(sql`
            ALTER TABLE "tb_detail_order" ALTER COLUMN "order_status" SET DEFAULT 'IN_REQUEST'
        `);
        console.log("✓ Default set to IN_REQUEST");

        // Step 6: Drop old enum
        console.log("\nStep 6: Dropping old enum type...");
        await db.execute(sql`DROP TYPE "order_status_old"`);
        console.log("✓ Old enum dropped");

        // Step 7: Verify
        console.log("\nStep 7: Verifying migration...");
        const newData = await db.execute(sql`
            SELECT order_status, COUNT(*) as count 
            FROM tb_detail_order 
            GROUP BY order_status
        `);
        console.log("New status distribution:", newData.rows);

        console.log("\n✅ Migration completed successfully!");
        console.log("\nStatus mapping yang diterapkan:");
        console.log("  PENDING    → IN_REQUEST");
        console.log("  CONFIRMED  → IN_QUEUE");
        console.log("  IN_PROGRESS → IN_PROGRESS");
        console.log("  COMPLETED  → FINAL");
        console.log("  CANCELLED  → IN_REQUEST");

    } catch (error) {
        console.error("\n❌ Migration failed:", error);
        
        // Rollback attempt
        console.log("\nAttempting rollback...");
        try {
            // Check if old enum still exists
            const enumCheck = await db.execute(sql`
                SELECT EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = 'order_status_old'
                )
            `);
            
            if (enumCheck.rows[0]?.exists) {
                // Rollback: rename old enum back
                await db.execute(sql`
                    ALTER TABLE "tb_detail_order" 
                    ALTER COLUMN "order_status" TYPE "order_status_old" 
                    USING "order_status"::text::"order_status_old"
                `);
                await db.execute(sql`DROP TYPE IF EXISTS "order_status"`);
                await db.execute(sql`ALTER TYPE "order_status_old" RENAME TO "order_status"`);
                console.log("✓ Rollback successful");
            }
        } catch (rollbackError) {
            console.error("Rollback failed:", rollbackError);
        }
        
        process.exit(1);
    }

    process.exit(0);
}

migrateOrderStatus();
