/**
 * Test Script: Push Orders from Database to MWL (DCM4CHEE/Orthanc)
 * 
 * Usage:
 *   bun run scripts/test-push-order-to-mwl.ts
 *   bun run scripts/test-push-order-to-mwl.ts <order_id>
 *   bun run scripts/test-push-order-to-mwl.ts <order_id> dcm4chee
 *   bun run scripts/test-push-order-to-mwl.ts <order_id> orthanc
 *   bun run scripts/test-push-order-to-mwl.ts <order_id> both
 * 
 * This script will:
 * 1. Get orders from database
 * 2. Push to MWL server (DCM4CHEE or Orthanc)
 */

import db from "@/database/db";
import { orderTable, detailOrderTable } from "@/database/schemas/schema-order";
import { patientTable } from "@/database/schemas/schema-patient";
import { loincTable } from "@/database/schemas/schema-loinc";
import { modalityTable } from "@/database/schemas/schema-modality";
import { eq, desc } from "drizzle-orm";
import { pushWorklistToDcm4chee, type DCM4CHEEMWLItem } from "@/lib/dcm4chee-mwl";
import { pushWorklistToOrthanc, type MWLWorklistItem } from "@/lib/orthanc-mwl";

type MWLTarget = "orthanc" | "dcm4chee" | "both";

// ===========================
// GET ORDERS FROM DATABASE
// ===========================

async function getOrdersFromDb(orderId?: string) {
    if (orderId) {
        // Get specific order
        const orders = await db
            .select({
                order: orderTable,
                patient: patientTable,
            })
            .from(orderTable)
            .leftJoin(patientTable, eq(orderTable.id_patient, patientTable.id))
            .where(eq(orderTable.id, orderId))
            .limit(1);

        return orders;
    }

    // Get recent orders
    const orders = await db
        .select({
            order: orderTable,
            patient: patientTable,
        })
        .from(orderTable)
        .leftJoin(patientTable, eq(orderTable.id_patient, patientTable.id))
        .orderBy(desc(orderTable.created_at))
        .limit(5);

    return orders;
}

async function getOrderDetails(orderId: string) {
    const details = await db
        .select({
            detail: detailOrderTable,
            loinc: loincTable,
            modality: modalityTable,
        })
        .from(detailOrderTable)
        .leftJoin(loincTable, eq(detailOrderTable.id_loinc, loincTable.id))
        .leftJoin(modalityTable, eq(loincTable.id_modality, modalityTable.id))
        .where(eq(detailOrderTable.id_order, orderId));

    return details;
}

// ===========================
// PUSH TO MWL
// ===========================

async function pushToMWL(
    order: any,
    detail: any,
    target: MWLTarget
): Promise<{ success: boolean; target: string; error?: string }[]> {
    const results: { success: boolean; target: string; error?: string }[] = [];

    // Get patient info
    const patientName = order.patient_name || order.patient?.name || "Unknown Patient";
    const patientMrn = order.patient_mrn || order.patient?.mrn || "UNKNOWN";
    const patientBirthDate = order.patient_birth_date || order.patient?.birth_date || "19000101";
    const patientGender = order.patient_gender || order.patient?.gender || "O";

    // Prepare MWL data
    const mwlData = {
        patientId: patientMrn,
        patientName: patientName,
        patientBirthDate: patientBirthDate,
        patientSex: (patientGender === "MALE" ? "M" : patientGender === "FEMALE" ? "F" : "O") as "M" | "F" | "O",
        accessionNumber: detail.detail.accession_number || `ACC-${Date.now()}`,
        requestedProcedure: detail.loinc?.loinc_display || detail.detail.code_text || "Radiologic Examination",
        modality: detail.detail.modality_code || detail.modality?.code || "OT",
        stationAETitle: detail.detail.ae_title || "UNKNOWN",
        scheduledDate: detail.detail.schedule_date || new Date(),
        scheduledStepId: `SPS-${detail.detail.accession_number || Date.now()}`,
        scheduledStepDescription: detail.loinc?.loinc_display || detail.detail.code_text || "Radiologic Examination",
        referringPhysician: detail.detail.requester_display || undefined,
    };

    // Push to DCM4CHEE
    if (target === "dcm4chee" || target === "both") {
        const dcm4cheeItem: DCM4CHEEMWLItem = mwlData;
        const result = await pushWorklistToDcm4chee(dcm4cheeItem);
        results.push({
            success: result.success,
            target: "dcm4chee",
            error: result.error,
        });
    }

    // Push to Orthanc
    if (target === "orthanc" || target === "both") {
        const orthancItem: MWLWorklistItem = mwlData;
        const result = await pushWorklistToOrthanc(orthancItem);
        results.push({
            success: result.success,
            target: "orthanc",
            error: result.error,
        });
    }

    return results;
}

// ===========================
// MAIN
// ===========================

async function main() {
    console.log("=".repeat(70));
    console.log("🏥 Push Orders from Database to MWL");
    console.log("=".repeat(70));
    console.log();

    // Get arguments
    const args = process.argv.slice(2);
    const orderId = args[0];
    const target: MWLTarget = (args[1] as MWLTarget) || "dcm4chee";

    console.log("📋 Configuration:");
    console.log("  Target:", target);
    console.log("  Order ID:", orderId || "Latest 5 orders");
    console.log();

    // Get orders from database
    console.log("📥 Fetching orders from database...\n");
    const orders = await getOrdersFromDb(orderId);

    if (orders.length === 0) {
        console.log("⚠️  No orders found in database");
        process.exit(0);
    }

    console.log(`✅ Found ${orders.length} order(s)\n`);

    let totalSuccess = 0;
    let totalFailed = 0;

    // Process each order
    for (let i = 0; i < orders.length; i++) {
        const { order, patient } = orders[i];
        
        console.log("=".repeat(70));
        console.log(`[${i + 1}/${orders.length}] Order: ${order.id}`);
        console.log("=".repeat(70));
        console.log("├─ Patient Name:", order.patient_name || patient?.name || "N/A");
        console.log("├─ Patient MRN:", order.patient_mrn || patient?.mrn || "N/A");
        console.log("├─ Created At:", order.created_at);
        console.log();

        // Get order details
        const details = await getOrderDetails(order.id);

        if (details.length === 0) {
            console.log("  ⚠️  No details found for this order\n");
            continue;
        }

        console.log(`  📋 Found ${details.length} detail(s):\n`);

        // Process each detail
        for (let j = 0; j < details.length; j++) {
            const detail = details[j];
            
            console.log(`  [${j + 1}/${details.length}] Detail: ${detail.detail.id}`);
            console.log(`  ├─ Accession: ${detail.detail.accession_number || "N/A"}`);
            console.log(`  ├─ Procedure: ${detail.loinc?.loinc_display || detail.detail.code_text || "N/A"}`);
            console.log(`  ├─ Modality: ${detail.detail.modality_code || detail.modality?.code || "N/A"}`);
            console.log(`  ├─ Schedule: ${detail.detail.schedule_date || "N/A"}`);
            console.log(`  └─ AE Title: ${detail.detail.ae_title || "N/A"}`);
            console.log();

            // Skip if missing accession number
            if (!detail.detail.accession_number) {
                console.log("  ⚠️  Skipping - Missing accession number\n");
                totalFailed++;
                continue;
            }

            // Push to MWL
            console.log(`  📡 Pushing to MWL (${target})...`);
            const results = await pushToMWL(order, detail, target);

            for (const result of results) {
                if (result.success) {
                    console.log(`  ✅ ${result.target}: Success`);
                    totalSuccess++;
                } else {
                    console.log(`  ❌ ${result.target}: Failed - ${result.error}`);
                    totalFailed++;
                }
            }
            console.log();
        }
    }

    console.log("=".repeat(70));
    console.log("📊 Summary:");
    console.log(`  ✅ Success: ${totalSuccess}`);
    console.log(`  ❌ Failed: ${totalFailed}`);
    console.log("=".repeat(70));
    console.log();
    console.log("🌐 Verify in Web UI:");
    console.log("  DCM4CHEE: http://192.168.250.205:8080/dcm4chee-arc/ui2 → MWL tab");
    console.log("  Orthanc: http://192.168.250.204:8042 → All Studies");
    console.log();

    process.exit(0);
}

main().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
});
