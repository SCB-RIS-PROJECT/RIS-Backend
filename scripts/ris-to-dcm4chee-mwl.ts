#!/usr/bin/env bun
/**
 * RIS to DCM4CHEE MWL Export Script
 * 
 * Script ini untuk mengirim data order dari RIS database ke DCM4CHEE MWL.
 * Data akan diambil dari tabel tb_order dan tb_detail_order, kemudian
 * dikirim ke DCM4CHEE via REST API.
 * 
 * Usage:
 *   bun run scripts/ris-to-dcm4chee-mwl.ts [options]
 * 
 * Options:
 *   --limit=N              : Batasi jumlah order yang dikirim (default: 10)
 *   --accession=ACC        : Kirim hanya order dengan accession number tertentu
 *   --order-id=UUID        : Kirim hanya order dengan ID tertentu
 *   --status=STATUS        : Filter berdasarkan status (default: IN_REQUEST,SCHEDULED)
 *   --from-date=YYYY-MM-DD : Filter order dari tanggal tertentu
 *   --to-date=YYYY-MM-DD   : Filter order sampai tanggal tertentu
 *   --dry-run              : Hanya preview data tanpa mengirim ke DCM4CHEE
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, sql, desc, gte, lte, inArray } from "drizzle-orm";
import pg from "pg";
import env from "@/config/env";
import {
    orderTable,
    detailOrderTable
} from "@/database/schemas/schema-order";
import { patientTable } from "@/database/schemas/schema-patient";
import { modalityTable } from "@/database/schemas/schema-modality";
import { practitionerTable } from "@/database/schemas/schema-practitioner";
import { loincTable } from "@/database/schemas/schema-loinc";
import {
    pushWorklistToDcm4chee,
    type DCM4CHEEMWLItem,
    DCM4CHEE_CONFIG
} from "@/lib/dcm4chee-mwl";

const { Pool } = pg;

// ===========================
// DATABASE CONNECTION
// ===========================

const pool = new Pool({
    connectionString: env.DATABASE_URL,
});

const db = drizzle(pool);

// ===========================
// TYPES
// ===========================

interface RISOrderData {
    // Order info
    orderId: string;
    orderNumber: string;
    accessionNumber: string;
    scheduleDate: Date;
    orderStatus: string;
    orderPriority: string;
    aeTitle: string | null;
    notes: string | null;

    // Patient info
    patientId: string;
    patientName: string;
    patientMrn: string;
    patientBirthDate: Date;
    patientGender: string;
    patientAddress: string | null;
    patientPhone: string | null;

    // Modality info
    modalityCode: string;
    modalityName: string;
    modalityAet: string[] | null;

    // LOINC/Procedure info
    loincCode: string | null;
    loincDisplay: string | null;

    // Practitioner info
    requesterName: string | null;
    performerName: string | null;
}

// ===========================
// QUERY FUNCTIONS
// ===========================

/**
 * Query orders dari database RIS
 */
async function queryOrdersFromRIS(options: {
    limit?: number;
    accessionNumber?: string;
    orderId?: string;
    statuses?: string[];
    fromDate?: Date;
    toDate?: Date;
}): Promise<RISOrderData[]> {
    console.log("📋 Querying orders from RIS database...");

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCounter = 1;

    // Filter by accession number
    if (options.accessionNumber) {
        conditions.push(`d.accession_number = $${paramCounter++}`);
        params.push(options.accessionNumber);
    }

    // Filter by order ID
    if (options.orderId) {
        conditions.push(`d.id = $${paramCounter++}`);
        params.push(options.orderId);
    }

    // Filter by status
    if (options.statuses && options.statuses.length > 0) {
        const placeholders = options.statuses.map((_, i) => `$${paramCounter + i}`).join(', ');
        conditions.push(`d.order_status IN (${placeholders})`);
        params.push(...options.statuses);
        paramCounter += options.statuses.length;
    }

    // Filter by date range
    if (options.fromDate) {
        conditions.push(`d.schedule_date >= $${paramCounter++}`);
        params.push(options.fromDate.toISOString());
    }
    if (options.toDate) {
        conditions.push(`d.schedule_date <= $${paramCounter++}`);
        params.push(options.toDate.toISOString());
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const limitValue = options.limit || 10;

    // Raw SQL query
    const query = `
        SELECT 
            -- Detail Order
            d.id as order_id,
            d.id_requester,
            d.id_performer,
            d.order_number,
            d.accession_number,
            d.schedule_date,
            d.order_status,
            d.order_priority,
            d.ae_title,
            d.notes,
            
            -- Patient from Order (denormalized)
            o.patient_name as patient_name_from_order,
            o.patient_mrn as patient_mrn_from_order,
            o.patient_birth_date as patient_birth_date_from_order,
            o.patient_gender as patient_gender_from_order,
            
            -- Patient from Patient table
            p.id as patient_id,
            p.name as patient_name,
            p.mrn as patient_mrn,
            p.birth_date as patient_birth_date,
            p.gender as patient_gender,
            p.address as patient_address,
            p.phone as patient_phone,
            
            -- Modality
            m.code as modality_code,
            m.name as modality_name,
            m.aet as modality_aet,
            
            -- LOINC
            l.loinc_code,
            l.loinc_display
            
        FROM tb_detail_order d
        LEFT JOIN tb_order o ON d.id_order = o.id
        LEFT JOIN tb_patient p ON o.id_patient = p.id
        LEFT JOIN tb_modality m ON d.id_modality = m.id
        LEFT JOIN tb_loinc l ON d.id_loinc = l.id
        ${whereClause}
        ORDER BY d.schedule_date DESC
        LIMIT $${paramCounter}
    `;

    params.push(limitValue);

    const result = await pool.query(query, params);
    const results = result.rows;

    console.log(`✅ Found ${results.length} orders in RIS database`);

    // Get unique practitioner IDs
    const practitionerIds = new Set<string>();
    results.forEach((row: any) => {
        if (row.id_requester) practitionerIds.add(row.id_requester);
        if (row.id_performer) practitionerIds.add(row.id_performer);
    });

    // Query practitioners
    const practitioners = new Map<string, string>();
    if (practitionerIds.size > 0) {
        const practitionerQuery = `
            SELECT id, name
            FROM tb_practitioner
            WHERE id = ANY($1::uuid[])
        `;
        const practitionerResult = await pool.query(practitionerQuery, [Array.from(practitionerIds)]);

        practitionerResult.rows.forEach((p: any) => {
            practitioners.set(p.id, p.name);
        });
    }

    // Transform results
    const orders: RISOrderData[] = results.map((row: any) => ({
        orderId: row.order_id,
        orderNumber: row.order_number || '',
        accessionNumber: row.accession_number || '',
        scheduleDate: row.schedule_date ? new Date(row.schedule_date) : new Date(),
        orderStatus: row.order_status || 'IN_REQUEST',
        orderPriority: row.order_priority || 'ROUTINE',
        aeTitle: row.ae_title,
        notes: row.notes,

        // Patient - use from patient table if available, otherwise from order table
        patientId: row.patient_id || row.order_id,
        patientName: row.patient_name || row.patient_name_from_order || 'Unknown Patient',
        patientMrn: row.patient_mrn || row.patient_mrn_from_order || 'UNKNOWN',
        patientBirthDate: row.patient_birth_date
            ? new Date(row.patient_birth_date)
            : row.patient_birth_date_from_order
                ? new Date(row.patient_birth_date_from_order)
                : new Date('1970-01-01'),
        patientGender: row.patient_gender || row.patient_gender_from_order || 'O',
        patientAddress: row.patient_address,
        patientPhone: row.patient_phone,

        // Modality
        modalityCode: row.modality_code || 'OT',
        modalityName: row.modality_name || 'Other',
        modalityAet: row.modality_aet,

        // LOINC
        loincCode: row.loinc_code,
        loincDisplay: row.loinc_display,

        // Practitioner
        requesterName: row.id_requester ? practitioners.get(row.id_requester) || null : null,
        performerName: row.id_performer ? practitioners.get(row.id_performer) || null : null,
    }));

    return orders;
}

/**
 * Convert RIS order to DCM4CHEE MWL format
 */
function convertRISToDCM4CHEE(order: RISOrderData): DCM4CHEEMWLItem {
    // Determine station AE title
    // Priority: 1. ae_title field, 2. modality AET array, 3. modality code
    let stationAETitle = 'UNKNOWN';
    if (order.aeTitle) {
        stationAETitle = order.aeTitle;
    } else if (order.modalityAet && order.modalityAet.length > 0) {
        stationAETitle = order.modalityAet[0];
    } else {
        stationAETitle = order.modalityCode;
    }

    // Determine procedure description
    const procedureDescription = order.loincDisplay || order.modalityName || order.notes || 'Radiological Examination';

    // Map gender
    const gender = order.patientGender?.toUpperCase() === 'MALE' || order.patientGender === 'M'
        ? 'M'
        : order.patientGender?.toUpperCase() === 'FEMALE' || order.patientGender === 'F'
            ? 'F'
            : 'O';

    // Generate scheduled step ID
    const scheduledStepId = `SPS-${order.accessionNumber || order.orderNumber}`;

    const dcm4cheeMWL: DCM4CHEEMWLItem = {
        // Patient info
        patientId: order.patientMrn,
        patientName: order.patientName,
        patientBirthDate: order.patientBirthDate,
        patientSex: gender as 'M' | 'F' | 'O',
        patientAddress: order.patientAddress || undefined,
        patientPhone: order.patientPhone || undefined,

        // Procedure info
        accessionNumber: order.accessionNumber,
        requestedProcedure: procedureDescription,

        // Schedule info
        modality: order.modalityCode,
        stationAETitle: stationAETitle,
        scheduledDate: order.scheduleDate,
        scheduledStepId: scheduledStepId,
        scheduledStepDescription: procedureDescription,

        // Referring physician
        referringPhysician: order.requesterName || order.performerName || 'Unknown Physician',
    };

    return dcm4cheeMWL;
}

/**
 * Push single order to DCM4CHEE
 */
async function pushOrderToDCM4CHEE(
    order: RISOrderData,
    index: number,
    total: number,
    dryRun: boolean = false
): Promise<boolean> {
    console.log(`\n[${index + 1}/${total}] Processing order...`);
    console.log(`├─ Order Number : ${order.orderNumber}`);
    console.log(`├─ Accession    : ${order.accessionNumber}`);
    console.log(`├─ Patient      : ${order.patientName} (MRN: ${order.patientMrn})`);
    console.log(`├─ Birth Date   : ${order.patientBirthDate.toISOString().split('T')[0]}`);
    console.log(`├─ Gender       : ${order.patientGender}`);
    console.log(`├─ Modality     : ${order.modalityCode} - ${order.modalityName}`);
    console.log(`├─ Procedure    : ${order.loincDisplay || order.modalityName}`);
    console.log(`├─ Scheduled    : ${order.scheduleDate.toISOString()}`);
    console.log(`├─ Status       : ${order.orderStatus}`);
    console.log(`├─ Priority     : ${order.orderPriority}`);
    console.log(`└─ Physician    : ${order.requesterName || 'N/A'}`);

    if (dryRun) {
        console.log(`  ℹ️  DRY RUN - Skipping push to DCM4CHEE`);
        return true;
    }

    // Convert to DCM4CHEE format
    const dcm4cheeMWL = convertRISToDCM4CHEE(order);

    // Push to DCM4CHEE
    const result = await pushWorklistToDcm4chee(dcm4cheeMWL);

    if (result.success) {
        console.log(`  ✅ SUCCESS - MWL created in DCM4CHEE`);
        if (result.mwlData) {
            console.log(`     Study UID: ${result.mwlData.studyInstanceUID}`);
        }
        return true;
    } else {
        console.log(`  ❌ FAILED: ${result.error}`);
        return false;
    }
}

// ===========================
// MAIN FUNCTION
// ===========================

async function main() {
    console.log("╔════════════════════════════════════════════════════════════════════════════╗");
    console.log("║               📤 RIS to DCM4CHEE MWL Export Script                         ║");
    console.log("╚════════════════════════════════════════════════════════════════════════════╝");
    console.log();

    // Parse command line arguments
    const args = process.argv.slice(2);
    const limitArg = args.find(arg => arg.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10;
    const accessionArg = args.find(arg => arg.startsWith('--accession='));
    const accessionNumber = accessionArg ? accessionArg.split('=')[1] : undefined;
    const orderIdArg = args.find(arg => arg.startsWith('--order-id='));
    const orderId = orderIdArg ? orderIdArg.split('=')[1] : undefined;
    const statusArg = args.find(arg => arg.startsWith('--status='));
    const statuses = statusArg ? statusArg.split('=')[1].split(',') : ['IN_REQUEST', 'IN_QUEUE'];
    const fromDateArg = args.find(arg => arg.startsWith('--from-date='));
    const fromDate = fromDateArg ? new Date(fromDateArg.split('=')[1]) : undefined;
    const toDateArg = args.find(arg => arg.startsWith('--to-date='));
    const toDate = toDateArg ? new Date(toDateArg.split('=')[1]) : undefined;
    const dryRun = args.includes('--dry-run');

    console.log("⚙️  Configuration:");
    console.log(`   Source      : RIS Database (PostgreSQL)`);
    console.log(`   Destination : DCM4CHEE @ ${DCM4CHEE_CONFIG.host}:${DCM4CHEE_CONFIG.port}`);
    console.log(`   Limit       : ${limit} orders`);
    console.log(`   Status      : ${statuses.join(', ')}`);
    if (accessionNumber) {
        console.log(`   Filter      : Accession = ${accessionNumber}`);
    }
    if (orderId) {
        console.log(`   Filter      : Order ID = ${orderId}`);
    }
    if (fromDate) {
        console.log(`   From Date   : ${fromDate.toISOString().split('T')[0]}`);
    }
    if (toDate) {
        console.log(`   To Date     : ${toDate.toISOString().split('T')[0]}`);
    }
    if (dryRun) {
        console.log(`   Mode        : DRY RUN (preview only)`);
    }
    console.log();

    try {
        // Query orders from RIS
        const orders = await queryOrdersFromRIS({
            limit,
            accessionNumber,
            orderId,
            statuses,
            fromDate,
            toDate,
        });

        if (orders.length === 0) {
            console.log("⚠️  No orders found matching the criteria.");
            await pool.end();
            return;
        }

        console.log("\n" + "=".repeat(80));
        console.log(`🚀 Starting export of ${orders.length} orders to DCM4CHEE...`);
        console.log("=".repeat(80));

        // Push orders to DCM4CHEE
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < orders.length; i++) {
            const success = await pushOrderToDCM4CHEE(orders[i], i, orders.length, dryRun);
            if (success) {
                successCount++;
            } else {
                failCount++;
            }

            // Small delay to avoid overwhelming the server
            if (i < orders.length - 1 && !dryRun) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.log("\n" + "=".repeat(80));
        console.log("📊 EXPORT SUMMARY");
        console.log("=".repeat(80));
        console.log(`✅ Success  : ${successCount} orders`);
        console.log(`❌ Failed   : ${failCount} orders`);
        console.log(`📋 Total    : ${orders.length} orders`);
        console.log("=".repeat(80));
        console.log();

        if (!dryRun) {
            console.log("📋 Verification:");
            console.log();
            console.log("1️⃣  Check DCM4CHEE Web UI:");
            console.log(`   URL: http://${DCM4CHEE_CONFIG.host}:${DCM4CHEE_CONFIG.port}/dcm4chee-arc/ui2`);
            console.log(`   Navigate to: Study → Worklist tab`);
            console.log();
            console.log("2️⃣  Query from Modality:");
            console.log(`   Configure your DICOM modality to query DCM4CHEE`);
            console.log(`   AE Title: ${DCM4CHEE_CONFIG.aeTitle}`);
            console.log(`   Host: ${DCM4CHEE_CONFIG.host}`);
            console.log(`   Port: ${env.DCM4CHEE_DICOM_PORT || 11112} (DICOM port)`);
            console.log();
        }

        if (failCount > 0) {
            console.log("⚠️  Some orders failed to export. Check the logs above for details.\n");
        } else {
            console.log("✅ Export completed successfully!\n");
        }

    } catch (error: any) {
        console.error("\n💥 Fatal error:", error.message);
        console.error(error.stack);
        await pool.end();
        process.exit(1);
    }

    // Close database connection
    await pool.end();
}

// ===========================
// RUN
// ===========================

main().catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
});
