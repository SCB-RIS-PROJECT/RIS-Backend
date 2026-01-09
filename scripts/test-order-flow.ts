/**
 * Test Order Flow Script
 * 
 * Script untuk testing complete flow order:
 * 1. Create Order (optional - bisa skip jika sudah ada order)
 * 2. Update Order Detail dengan Modality & Performer
 * 3. Push to MWL
 * 4. Finalize Order
 * 
 * Usage:
 * 
 * 1. Update existing order by ID:
 *    bun run scripts/test-order-flow.ts --orderId <id> --detailId <id>
 * 
 * 2. Update existing order by Accession Number:
 *    bun run scripts/test-order-flow.ts --acsn <accession_number>
 * 
 * 3. Create new order and test full flow:
 *    bun run scripts/test-order-flow.ts --create
 * 
 * Options:
 *   --orderId <id>           : Order ID
 *   --detailId <id>          : Detail Order ID
 *   --acsn <accession>       : Accession Number
 *   --create                 : Create new order first
 *   --skipUpdate             : Skip update step
 *   --skipPushMWL            : Skip push to MWL step
 *   --skipFinalize           : Skip finalize step
 *   --modalityId <id>        : Modality ID (default: auto-select first)
 *   --performerId <id>       : Performer ID (default: auto-select first)
 *   --aeTitle <title>        : AE Title (default: auto-select from modality)
 *   --mwlTarget <target>     : MWL target: orthanc|dcm4chee|both (default: dcm4chee)
 */

import { eq } from "drizzle-orm";
import { db } from "../src/database/connection";
import {
    orderTable,
    detailOrderTable,
    modalityTable,
    practitionerTable,
    loincTable
} from "../src/database/schema";

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8001";
const API_TOKEN = process.env.API_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmMDFlYTliZi1mODdlLTQwMTYtOTk0ZC0zZTYxYzAwYmE3NzIiLCJlbWFpbCI6ImFkbWluQGFkbWluLmNvbSIsImlhdCI6MTc2Nzk0NTQxOCwiZXhwIjoxNzY4NTUwMjE4LCJhdWQiOiJyaXMtY2xpZW50IiwiaXNzIjoicmlzLWFwaSJ9.PlF6-ek1JkV38DlOT8LLRm8dosQw8iIWKVNfpCsv56Q"; // Set your JWT token here or via env

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const parsed: Record<string, string | boolean> = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg.startsWith("--")) {
            const key = arg.slice(2);
            const nextArg = args[i + 1];

            if (nextArg && !nextArg.startsWith("--")) {
                parsed[key] = nextArg;
                i++;
            } else {
                parsed[key] = true;
            }
        }
    }

    return parsed;
}

// Fetch order by ID
async function fetchOrderById(orderId: string) {
    console.log(`\n📋 Fetching order: ${orderId}`);

    const [order] = await db
        .select()
        .from(orderTable)
        .where(eq(orderTable.id, orderId))
        .limit(1);

    if (!order) {
        throw new Error(`Order not found: ${orderId}`);
    }

    const details = await db
        .select()
        .from(detailOrderTable)
        .where(eq(detailOrderTable.id_order, orderId));

    console.log(`✅ Found order with ${details.length} details`);
    return { order, details };
}

// Fetch order by Accession Number
async function fetchOrderByACSN(acsn: string) {
    console.log(`\n📋 Fetching order by ACSN: ${acsn}`);

    const [detail] = await db
        .select()
        .from(detailOrderTable)
        .where(eq(detailOrderTable.accession_number, acsn))
        .limit(1);

    if (!detail) {
        throw new Error(`Order detail not found with ACSN: ${acsn}`);
    }

    const [order] = await db
        .select()
        .from(orderTable)
        .where(eq(orderTable.id, detail.id_order))
        .limit(1);

    if (!order) {
        throw new Error(`Order not found for detail: ${detail.id}`);
    }

    console.log(`✅ Found order: ${order.id}, detail: ${detail.id}`);
    return { order, details: [detail] };
}

// Create new test order
async function createTestOrder() {
    console.log("\n🆕 Creating new test order...");

    // Get first available LOINC
    const [loinc] = await db
        .select()
        .from(loincTable)
        .limit(1);

    if (!loinc) {
        throw new Error("No LOINC data found in database. Please seed LOINC data first.");
    }

    // Get first practitioner
    const [practitioner] = await db
        .select()
        .from(practitionerTable)
        .limit(1);

    if (!practitioner) {
        throw new Error("No practitioner found in database. Please seed practitioner data first.");
    }

    const createOrderData = {
        id_pelayanan: "TEST-SERVICE-001",
        subject: {
            patient_name: "John Doe Test",
            patient_mrn: `MRN${Date.now()}`,
            patient_birth_date: "1990-01-01",
            patient_age: 34,
            patient_gender: "MALE" as const,
            ihs_id: null,
        },
        encounter: {
            encounter_id: null,
        },
        requester: {
            id_practitioner: practitioner.ihs_number || "IHS-TEST-001",
            name_practitioner: practitioner.name,
        },
        diagnosa: {
            code: "A15.0",
            display: "Tuberculosis of lung",
        },
        order_priority: "ROUTINE" as const,
        notes: "Test order from automated script",
        details: [
            {
                id_loinc: loinc.id,
            },
        ],
    };

    // Use direct DB insert instead of API call
    const [order] = await db
        .insert(orderTable)
        .values({
            id_patient: null,
            id_practitioner: practitioner.id,
            id_created_by: practitioner.id, // Use practitioner as creator for testing
            id_encounter_ss: null,
            id_pelayanan: createOrderData.id_pelayanan,
            patient_name: createOrderData.subject.patient_name,
            patient_mrn: createOrderData.subject.patient_mrn,
            patient_birth_date: createOrderData.subject.patient_birth_date,
            patient_age: createOrderData.subject.patient_age,
            patient_gender: createOrderData.subject.patient_gender,
        })
        .returning();

    // Generate accession number
    const now = new Date();
    const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSeq = Math.floor(Math.random() * 9000) + 1000;
    const accessionNumber = `OT${datePrefix}${randomSeq}`;
    const orderNumber = `ORD-${accessionNumber}`;

    const [detail] = await db
        .insert(detailOrderTable)
        .values({
            id_order: order.id,
            id_loinc: loinc.id,
            id_modality: null,
            accession_number: accessionNumber,
            order_number: orderNumber,
            schedule_date: new Date(),
            order_priority: "ROUTINE",
            order_from: "EXTERNAL",
            order_status: "IN_REQUEST",
            ae_title: null,
            diagnosis_code: "A15.0",
            diagnosis_display: "Tuberculosis of lung",
            notes: "Test order from automated script",
            service_request_json: null,
        })
        .returning();

    console.log(`✅ Order created: ${order.id}`);
    console.log(`   Detail ID: ${detail.id}`);
    console.log(`   ACSN: ${accessionNumber}`);

    return { order, details: [detail] };
}

// Update order detail with modality and performer
async function updateOrderDetail(orderId: string, detailId: string, modalityId?: string, performerId?: string, aeTitle?: string) {
    console.log("\n🔄 Updating order detail with modality & performer...");

    // Get available modalities if not specified
    let selectedModalityId = modalityId;
    let selectedAETitle = aeTitle;

    if (!selectedModalityId) {
        const modalities = await db.select().from(modalityTable).limit(5);

        if (modalities.length === 0) {
            throw new Error("No modalities found in database. Please seed modality data first.");
        }

        console.log("\n📋 Available Modalities:");
        modalities.forEach((m, i) => {
            console.log(`   ${i + 1}. ${m.name} (${m.code}) - AE Titles: ${m.aet?.join(", ") || "none"}`);
        });

        selectedModalityId = modalities[0].id;
        selectedAETitle = modalities[0].aet?.[0] || "DEFAULT_AET";

        console.log(`\n✅ Auto-selected: ${modalities[0].name} (${selectedAETitle})`);
    }

    // Get available practitioners if not specified
    let selectedPerformerId = performerId;

    if (!selectedPerformerId) {
        const practitioners = await db.select().from(practitionerTable).limit(5);

        if (practitioners.length === 0) {
            throw new Error("No practitioners found in database. Please seed practitioner data first.");
        }

        console.log("\n📋 Available Practitioners:");
        practitioners.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.name} (IHS: ${p.ihs_number || "N/A"})`);
        });

        selectedPerformerId = practitioners[0].id;

        console.log(`\n✅ Auto-selected: ${practitioners[0].name}`);
    }

    // Update via direct DB
    const [updated] = await db
        .update(detailOrderTable)
        .set({
            id_modality: selectedModalityId,
            ae_title: selectedAETitle,
            id_performer: selectedPerformerId,
            updated_at: new Date(),
        })
        .where(eq(detailOrderTable.id, detailId))
        .returning();

    console.log(`✅ Order detail updated successfully`);
    console.log(`   Modality ID: ${selectedModalityId}`);
    console.log(`   AE Title: ${selectedAETitle}`);
    console.log(`   Performer ID: ${selectedPerformerId}`);

    return updated;
}

// Push to MWL
async function pushToMWL(orderId: string, detailId: string, target: string = "dcm4chee") {
    console.log(`\n📤 Pushing to MWL (${target})...`);

    // Get order and detail data
    const [order] = await db
        .select()
        .from(orderTable)
        .where(eq(orderTable.id, orderId))
        .limit(1);

    const [detail] = await db
        .select({
            detail: detailOrderTable,
            loinc: loincTable,
            modality: modalityTable,
            performer: practitionerTable,
        })
        .from(detailOrderTable)
        .leftJoin(loincTable, eq(detailOrderTable.id_loinc, loincTable.id))
        .leftJoin(modalityTable, eq(detailOrderTable.id_modality, modalityTable.id))
        .leftJoin(practitionerTable, eq(detailOrderTable.id_performer, practitionerTable.id))
        .where(eq(detailOrderTable.id, detailId))
        .limit(1);

    if (!detail) {
        throw new Error("Order detail not found");
    }

    // Validate required data
    if (!detail.detail.accession_number) {
        throw new Error("Missing accession number");
    }

    if (!detail.modality) {
        throw new Error("Missing modality data. Please update order first.");
    }

    if (!detail.detail.ae_title) {
        throw new Error("Missing AE Title. Please update order first.");
    }

    if (!detail.performer) {
        throw new Error("Missing performer. Please update order first.");
    }

    console.log(`✅ Validation passed. Ready to push to MWL.`);
    console.log(`   ACSN: ${detail.detail.accession_number}`);
    console.log(`   Modality: ${detail.modality.code}`);
    console.log(`   AE Title: ${detail.detail.ae_title}`);
    console.log(`   Performer: ${detail.performer.name}`);

    // Update status to IN_QUEUE
    await db
        .update(detailOrderTable)
        .set({
            order_status: "IN_QUEUE",
            updated_at: new Date(),
        })
        .where(eq(detailOrderTable.id, detailId));

    console.log(`✅ Status updated to IN_QUEUE`);
    console.log(`⚠️  Note: Actual MWL push requires MWL server integration`);

    return detail;
}

// Finalize order
async function finalizeOrder(orderId: string, detailId: string) {
    console.log("\n✅ Finalizing order...");

    const observationNotes = `Test observation notes from automated script.
Patient shows normal radiological findings.
No abnormalities detected in the examination area.
Heart size is within normal limits.
Lungs are clear bilaterally.
No pleural effusion or pneumothorax.`;

    const diagnosticConclusion = `Test diagnostic conclusion:
Based on radiological examination, all findings are within normal limits.
No pathological changes identified.
Recommend clinical correlation if symptoms persist.`;

    // Update status to FINAL and add notes
    const [updated] = await db
        .update(detailOrderTable)
        .set({
            order_status: "FINAL",
            observation_notes: observationNotes,
            diagnostic_conclusion: diagnosticConclusion,
            updated_at: new Date(),
        })
        .where(eq(detailOrderTable.id, detailId))
        .returning();

    console.log(`✅ Order finalized successfully`);
    console.log(`   Status: ${updated.order_status}`);
    console.log(`   Observation notes length: ${observationNotes.length} chars`);
    console.log(`   Diagnostic conclusion length: ${diagnosticConclusion.length} chars`);

    return updated;
}

// Main execution
async function main() {
    console.log("🚀 Order Flow Testing Script");
    console.log("================================\n");

    const args = parseArgs();

    try {
        let orderId: string;
        let detailId: string;
        let details: any[];

        // Step 1: Get or create order
        if (args.create) {
            const result = await createTestOrder();
            orderId = result.order.id;
            details = result.details;
            detailId = details[0].id;
        } else if (args.acsn) {
            const result = await fetchOrderByACSN(args.acsn as string);
            orderId = result.order.id;
            details = result.details;
            detailId = details[0].id;
        } else if (args.orderId && args.detailId) {
            const result = await fetchOrderById(args.orderId as string);
            orderId = result.order.id;
            details = result.details;
            detailId = args.detailId as string;
        } else if (args.orderId) {
            const result = await fetchOrderById(args.orderId as string);
            orderId = result.order.id;
            details = result.details;

            if (details.length === 0) {
                throw new Error("Order has no details");
            }

            detailId = details[0].id;
            console.log(`\nℹ️  Using first detail: ${detailId}`);
        } else {
            console.error("❌ Error: Missing required arguments");
            console.log("\nUsage:");
            console.log("  --create                          : Create new order");
            console.log("  --acsn <accession_number>        : Use existing order by ACSN");
            console.log("  --orderId <id> --detailId <id>   : Use existing order by IDs");
            console.log("  --orderId <id>                    : Use first detail of order");
            process.exit(1);
        }

        console.log("\n📝 Order Info:");
        console.log(`   Order ID: ${orderId}`);
        console.log(`   Detail ID: ${detailId}`);

        // Step 2: Update order detail (unless skipped)
        if (!args.skipUpdate) {
            await updateOrderDetail(
                orderId,
                detailId,
                args.modalityId as string,
                args.performerId as string,
                args.aeTitle as string
            );
        } else {
            console.log("\n⏭️  Skipping update step");
        }

        // Step 3: Push to MWL (unless skipped)
        if (!args.skipPushMWL) {
            await pushToMWL(orderId, detailId, (args.mwlTarget as string) || "dcm4chee");
        } else {
            console.log("\n⏭️  Skipping push to MWL step");
        }

        // Step 4: Finalize order (unless skipped)
        if (!args.skipFinalize) {
            await finalizeOrder(orderId, detailId);
        } else {
            console.log("\n⏭️  Skipping finalize step");
        }

        console.log("\n\n✅ ===================================");
        console.log("✅ FLOW COMPLETED SUCCESSFULLY");
        console.log("✅ ===================================\n");

        console.log("📊 Summary:");
        console.log(`   Order ID: ${orderId}`);
        console.log(`   Detail ID: ${detailId}`);
        console.log(`   Steps completed: ${[
            !args.skipUpdate && "Update",
            !args.skipPushMWL && "Push MWL",
            !args.skipFinalize && "Finalize"
        ].filter(Boolean).join(" → ")}`);

    } catch (error) {
        console.error("\n❌ Error:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

// Run main
main();
