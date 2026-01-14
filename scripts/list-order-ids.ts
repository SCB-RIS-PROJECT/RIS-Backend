#!/usr/bin/env bun
/**
 * List first 10 order IDs from database
 */

import db from "../src/database/db";
import { orderTable } from "../src/database/schemas/schema-order";

async function listOrders() {
    console.log("📋 First 10 Orders in Database:\n");

    const orders = await db
        .select({
            id: orderTable.id,
            patient_name: orderTable.patient_name,
            patient_mrn: orderTable.patient_mrn,
            created_at: orderTable.created_at,
        })
        .from(orderTable)
        .limit(10);

    orders.forEach((order, index) => {
        console.log(`${index + 1}. ${order.patient_name} (MRN: ${order.patient_mrn})`);
        console.log(`   ID: ${order.id}`);
        console.log(`   Created: ${order.created_at}\n`);
    });

    process.exit(0);
}

listOrders();
