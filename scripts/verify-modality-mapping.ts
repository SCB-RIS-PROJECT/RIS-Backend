#!/usr/bin/env bun
/**
 * Verify Modality Mapping
 * Check if modality mapping was successful
 */

import db from "../src/database/db";
import { detailOrderTable } from "../src/database/schemas/schema-order";
import { modalityTable } from "../src/database/schemas/schema-modality";
import { sql } from "drizzle-orm";

async function verifyModalityMapping() {
    console.log("╔════════════════════════════════════════════════════════════════════════════╗");
    console.log("║             🔍 MODALITY MAPPING VERIFICATION                               ║");
    console.log("╚════════════════════════════════════════════════════════════════════════════╝\n");

    try {
        // Count total detail orders
        const totalOrders = await db.select({ count: sql<number>`count(*)` })
            .from(detailOrderTable);

        console.log(`📊 Total Detail Orders: ${totalOrders[0].count}\n`);

        // Count orders with modality
        const ordersWithModality = await db.select({ count: sql<number>`count(*)` })
            .from(detailOrderTable)
            .where(sql`id_modality IS NOT NULL`);

        console.log(`✅ Orders with Modality: ${ordersWithModality[0].count}`);

        // Count orders without modality
        const ordersWithoutModality = await db.select({ count: sql<number>`count(*)` })
            .from(detailOrderTable)
            .where(sql`id_modality IS NULL`);

        console.log(`⚠️  Orders without Modality: ${ordersWithoutModality[0].count}\n`);

        // Count by modality
        console.log("📋 Distribution by Modality:\n");

        const distribution = await db
            .select({
                modality_code: modalityTable.code,
                modality_name: modalityTable.name,
                count: sql<number>`count(${detailOrderTable.id})`
            })
            .from(detailOrderTable)
            .leftJoin(modalityTable, sql`${detailOrderTable.id_modality} = ${modalityTable.id}`)
            .groupBy(modalityTable.code, modalityTable.name)
            .orderBy(sql`count(${detailOrderTable.id}) DESC`);

        distribution.forEach((item, idx) => {
            const code = item.modality_code || "NULL";
            const name = item.modality_name || "No Modality";
            console.log(`${idx + 1}. ${code.padEnd(6)} - ${name.padEnd(30)} : ${item.count} orders`);
        });

        // Sample data with modality
        console.log("\n📝 Sample Orders with Modality:\n");

        const sampleWithModality = await db
            .select({
                acsn: detailOrderTable.accession_number,
                modality_code: modalityTable.code,
                modality_name: modalityTable.name,
                order_status: detailOrderTable.order_status,
            })
            .from(detailOrderTable)
            .leftJoin(modalityTable, sql`${detailOrderTable.id_modality} = ${modalityTable.id}`)
            .where(sql`${detailOrderTable.id_modality} IS NOT NULL`)
            .limit(5);

        sampleWithModality.forEach((item, idx) => {
            console.log(`${idx + 1}. ACSN: ${item.acsn}`);
            console.log(`   Modality: ${item.modality_code} (${item.modality_name})`);
            console.log(`   Status: ${item.order_status}\n`);
        });

        // Calculate success rate
        const total = Number(totalOrders[0].count);
        const withModality = Number(ordersWithModality[0].count);
        const successRate = ((withModality / total) * 100).toFixed(2);

        console.log("═".repeat(80));
        console.log("📈 SUMMARY");
        console.log("═".repeat(80));
        console.log(`Total Orders           : ${total}`);
        console.log(`With Modality Mapping  : ${withModality} (${successRate}%)`);
        console.log(`Without Modality       : ${total - withModality}`);
        console.log(`Status                 : ${successRate === "100.00" ? "✅ PERFECT!" : "⚠️  SOME MISSING"}`);
        console.log("═".repeat(80));

        console.log("\n✅ Verification completed!\n");
        process.exit(0);
    } catch (error: any) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

verifyModalityMapping();
