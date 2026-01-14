#!/usr/bin/env bun
/**
 * Check Import Result
 * Simple script to verify data import from PACS
 */

import db from "../src/database/db";
import { orderTable, detailOrderTable } from "../src/database/schemas/schema-order";
import { sql } from "drizzle-orm";

async function checkImport() {
    console.log("╔════════════════════════════════════════════════════════════════════════════╗");
    console.log("║             📊 IMPORT VERIFICATION REPORT                                  ║");
    console.log("╚════════════════════════════════════════════════════════════════════════════╝\n");

    try {
        // Count orders
        const orderCount = await db.select({ count: sql<number>`count(*)` }).from(orderTable);
        console.log(`✅ Total Orders: ${orderCount[0].count}`);

        // Count detail orders
        const detailOrderCount = await db.select({ count: sql<number>`count(*)` }).from(detailOrderTable);
        console.log(`✅ Total Detail Orders: ${detailOrderCount[0].count}\n`);

        // Sample data
        console.log("📋 Sample Data (First 5 records):\n");
        const sampleData = await db
            .select({
                acsn: detailOrderTable.accession_number,
                patientName: orderTable.patient_name,
                patientMRN: orderTable.patient_mrn,
                scheduleDate: detailOrderTable.schedule_date,
            })
            .from(detailOrderTable)
            .leftJoin(orderTable, sql`${detailOrderTable.id_order} = ${orderTable.id}`)
            .limit(5);

        sampleData.forEach((row, idx) => {
            console.log(`${idx + 1}. ACSN: ${row.acsn}`);
            console.log(`   Patient: ${row.patientName} (${row.patientMRN})`);
            console.log(`   Date: ${row.scheduleDate}\n`);
        });

        console.log("✅ Import verification completed!\n");
        process.exit(0);
    } catch (error: any) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

checkImport();
