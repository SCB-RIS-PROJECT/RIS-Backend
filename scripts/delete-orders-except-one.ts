/**
 * Script to delete all orders EXCEPT one specific order
 * 
 * Usage:
 *   bun run scripts/delete-orders-except-one.ts
 * 
 * Safety features:
 * - Shows which orders will be deleted
 * - Keeps the specified order intact
 * - Deletes detail_orders first (FK constraint)
 */

import db from "../src/database/db";
import { orderTable, detailOrderTable } from "../src/database/schemas/schema-order";
import { sql, ne } from "drizzle-orm";

// ⚠️ IMPORTANT: Change this ID to the order you want to KEEP
const ORDER_ID_TO_KEEP = "523dd7ef-c92c-43ff-8863-1826182d7f11";

async function main() {
    console.log("╔════════════════════════════════════════════════════════════════════════════╗");
    console.log("║         🗑️  DELETE ALL ORDERS EXCEPT ONE                                   ║");
    console.log("╚════════════════════════════════════════════════════════════════════════════╝\n");

    console.log(`⚠️  Order to KEEP: ${ORDER_ID_TO_KEEP}\n`);

    // Step 1: Count current data
    console.log("📊 Current Data Count:");
    const [totalOrdersResult] = await db.select({ count: sql<number>`count(*)` }).from(orderTable);
    const [totalDetailOrdersResult] = await db.select({ count: sql<number>`count(*)` }).from(detailOrderTable);

    const totalOrders = Number(totalOrdersResult.count);
    const totalDetailOrders = Number(totalDetailOrdersResult.count);

    console.log(`   Total Orders: ${totalOrders}`);
    console.log(`   Total Detail Orders: ${totalDetailOrders}\n`);

    // Step 2: Count orders to delete
    const [ordersToDeleteResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(orderTable)
        .where(ne(orderTable.id, ORDER_ID_TO_KEEP));

    const ordersToDeleteCount = Number(ordersToDeleteResult.count);

    // Step 3: Count detail orders to delete
    const [detailOrdersToDeleteResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(detailOrderTable)
        .where(ne(detailOrderTable.id_order, ORDER_ID_TO_KEEP));

    const detailOrdersToDeleteCount = Number(detailOrdersToDeleteResult.count);

    console.log("🎯 Data to DELETE:");
    console.log(`   Orders to delete: ${ordersToDeleteCount}`);
    console.log(`   Detail Orders to delete: ${detailOrdersToDeleteCount}\n`);

    console.log("✅ Data to KEEP:");
    console.log(`   Orders to keep: ${totalOrders - ordersToDeleteCount}`);
    console.log(`   Detail Orders to keep: ${totalDetailOrders - detailOrdersToDeleteCount}\n`);

    // Step 4: Show sample of orders to delete
    if (ordersToDeleteCount > 0) {
        console.log("📋 Sample of orders that will be DELETED (first 5):");
        const ordersToDelete = await db
            .select({
                id: orderTable.id,
                patient_name: orderTable.patient_name,
                patient_mrn: orderTable.patient_mrn,
                created_at: orderTable.created_at,
            })
            .from(orderTable)
            .where(ne(orderTable.id, ORDER_ID_TO_KEEP))
            .limit(5);

        ordersToDelete.forEach((order, index) => {
            console.log(`   ${index + 1}. ${order.patient_name} (MRN: ${order.patient_mrn})`);
            console.log(`      ID: ${order.id}`);
            console.log(`      Created: ${order.created_at}`);
        });
        console.log("");
    }

    // Step 5: Show the order that will be KEPT
    console.log("🔒 Order that will be KEPT:");
    const orderToKeep = await db
        .select({
            id: orderTable.id,
            patient_name: orderTable.patient_name,
            patient_mrn: orderTable.patient_mrn,
            created_at: orderTable.created_at,
        })
        .from(orderTable)
        .where(sql`${orderTable.id} = ${ORDER_ID_TO_KEEP}`)
        .limit(1);

    if (orderToKeep.length > 0) {
        const order = orderToKeep[0];
        console.log(`   Patient: ${order.patient_name} (MRN: ${order.patient_mrn})`);
        console.log(`   ID: ${order.id}`);
        console.log(`   Created: ${order.created_at}\n`);
    } else {
        console.log(`   ⚠️  Order with ID ${ORDER_ID_TO_KEEP} NOT FOUND!\n`);
        console.log("   ❌ Aborting deletion to prevent deleting everything!\n");
        process.exit(1);
    }

    // Step 6: Confirmation
    console.log("⚠️  WARNING: This will DELETE data permanently!");
    console.log("────────────────────────────────────────────────────────────────────────────────");
    console.log(`   Will DELETE: ${ordersToDeleteCount} orders and ${detailOrdersToDeleteCount} detail orders`);
    console.log(`   Will KEEP: 1 order (ID: ${ORDER_ID_TO_KEEP})`);
    console.log("────────────────────────────────────────────────────────────────────────────────\n");

    // Auto-proceed (since user requested to run directly)
    console.log("🚀 Proceeding with deletion...\n");

    // Step 7: Delete detail orders first (FK constraint)
    console.log("🗑️  Step 1: Deleting detail orders...");
    const deletedDetailOrders = await db
        .delete(detailOrderTable)
        .where(ne(detailOrderTable.id_order, ORDER_ID_TO_KEEP));

    console.log(`   ✅ Deleted ${detailOrdersToDeleteCount} detail orders\n`);

    // Step 8: Delete orders
    console.log("🗑️  Step 2: Deleting orders...");
    const deletedOrders = await db
        .delete(orderTable)
        .where(ne(orderTable.id, ORDER_ID_TO_KEEP));

    console.log(`   ✅ Deleted ${ordersToDeleteCount} orders\n`);

    // Step 9: Verify remaining data
    console.log("📊 After Deletion:");
    const [remainingOrdersResult] = await db.select({ count: sql<number>`count(*)` }).from(orderTable);
    const [remainingDetailOrdersResult] = await db.select({ count: sql<number>`count(*)` }).from(detailOrderTable);

    const remainingOrders = Number(remainingOrdersResult.count);
    const remainingDetailOrders = Number(remainingDetailOrdersResult.count);

    console.log(`   Remaining Orders: ${remainingOrders}`);
    console.log(`   Remaining Detail Orders: ${remainingDetailOrders}\n`);

    // Step 10: Verify the kept order still exists
    const verifyKeptOrder = await db
        .select({ count: sql<number>`count(*)` })
        .from(orderTable)
        .where(sql`${orderTable.id} = ${ORDER_ID_TO_KEEP}`);

    const keptOrderExists = Number(verifyKeptOrder[0].count) > 0;

    if (keptOrderExists) {
        console.log(`✅ Verified: Order ${ORDER_ID_TO_KEEP} still exists!\n`);
    } else {
        console.log(`❌ ERROR: Order ${ORDER_ID_TO_KEEP} was accidentally deleted!\n`);
    }

    console.log("================================================================================");
    console.log("📈 DELETION SUMMARY");
    console.log("================================================================================");
    console.log(`   Orders deleted             : ${ordersToDeleteCount}`);
    console.log(`   Detail Orders deleted      : ${detailOrdersToDeleteCount}`);
    console.log(`   Orders remaining           : ${remainingOrders}`);
    console.log(`   Detail Orders remaining    : ${remainingDetailOrders}`);
    console.log(`   Protected Order            : ${ORDER_ID_TO_KEEP}`);
    console.log("================================================================================\n");

    console.log("✅ Script completed successfully!\n");

    process.exit(0);
}

main().catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
});
