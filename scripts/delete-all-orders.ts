#!/usr/bin/env bun
/**
 * Delete All Orders Script
 * DANGER: This will delete ALL orders and detail orders from database
 */

import db from "../src/database/db";
import { orderTable, detailOrderTable } from "../src/database/schemas/schema-order";
import { sql } from "drizzle-orm";

async function deleteAllOrders() {
    console.log("╔════════════════════════════════════════════════════════════════════════════╗");
    console.log("║             ⚠️  DELETE ALL ORDERS - DANGER ZONE                            ║");
    console.log("╚════════════════════════════════════════════════════════════════════════════╝\n");

    try {
        // Count before deletion
        const orderCountBefore = await db.select({ count: sql<number>`count(*)` }).from(orderTable);
        const detailOrderCountBefore = await db.select({ count: sql<number>`count(*)` }).from(detailOrderTable);

        console.log(`📊 Current Data:`);
        console.log(`   Orders: ${orderCountBefore[0].count}`);
        console.log(`   Detail Orders: ${detailOrderCountBefore[0].count}\n`);

        console.log(`🗑️  Deleting all data...`);

        await db.transaction(async (tx) => {
            // Delete detail orders first (foreign key)
            await tx.delete(detailOrderTable);
            console.log(`   ✅ Detail Orders deleted`);

            // Then delete orders
            await tx.delete(orderTable);
            console.log(`   ✅ Orders deleted`);
        });

        // Verify deletion
        const orderCountAfter = await db.select({ count: sql<number>`count(*)` }).from(orderTable);
        const detailOrderCountAfter = await db.select({ count: sql<number>`count(*)` }).from(detailOrderTable);

        console.log(`\n📊 After Deletion:`);
        console.log(`   Orders: ${orderCountAfter[0].count}`);
        console.log(`   Detail Orders: ${detailOrderCountAfter[0].count}\n`);

        console.log(`✅ All orders deleted successfully!\n`);
        process.exit(0);
    } catch (error: any) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

deleteAllOrders();
