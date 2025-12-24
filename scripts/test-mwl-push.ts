/**
 * Test Script: Push Dummy MWL Data to Orthanc
 * 
 * Usage:
 *   bun run scripts/test-mwl-push.ts
 * 
 * This script will:
 * 1. Create dummy MWL worklist item
 * 2. Push to Orthanc MWL server
 * 3. Verify the worklist can be queried
 */

import { pushWorklistToOrthanc, queryWorklistByAccession, type MWLWorklistItem } from "@/lib/orthanc-mwl";
import env from "@/config/env";

const ORTHANC_URL = env.ORTHANC_URL ?? "http://localhost";
const ORTHANC_HTTP_PORT = env.ORTHANC_HTTP_PORT ?? 8042;
const ORTHANC_DICOM_PORT = env.ORTHANC_DICOM_PORT ?? 4242;
const ORTHANC_BASE_URL = `${ORTHANC_URL}:${ORTHANC_HTTP_PORT}`;

// ===========================
// DUMMY DATA
// ===========================

const dummyWorklists: MWLWorklistItem[] = [
    {
        // Patient Info
        patientId: "MR202312230001",
        patientName: "Budi Santoso",
        patientBirthDate: "1985-05-15",
        patientSex: "M",

        // Procedure
        accessionNumber: "20231223-0001",
        requestedProcedure: "XR Chest PA upright",

        // Schedule
        modality: "DX", // Digital Radiography
        stationAETitle: "XRAY01",
        scheduledDate: new Date("2023-12-24T08:30:00Z"),
        scheduledStepId: "SPS-20231223-0001",
        scheduledStepDescription: "Chest X-Ray PA view",

        // Referring Physician
        referringPhysician: "dr. Siti Aminah, Sp.PD",
    },
    {
        // Patient Info
        patientId: "MR202312230002",
        patientName: "Siti Rahayu",
        patientBirthDate: "1990-03-20",
        patientSex: "F",

        // Procedure
        accessionNumber: "20231223-0002",
        requestedProcedure: "CT Scan Head without contrast",

        // Schedule
        modality: "CT",
        stationAETitle: "CT01",
        scheduledDate: new Date("2023-12-24T10:00:00Z"),
        scheduledStepId: "SPS-20231223-0002",
        scheduledStepDescription: "Head CT non-contrast",

        // Referring Physician
        referringPhysician: "dr. Ahmad Neurologi, Sp.S",
    },
    {
        // Patient Info
        patientId: "MR202312230003",
        patientName: "Ahmad Hidayat",
        patientBirthDate: "1975-11-08",
        patientSex: "M",

        // Procedure
        accessionNumber: "20231223-0003",
        requestedProcedure: "MRI Lumbal Spine",

        // Schedule
        modality: "MR",
        stationAETitle: "MRI01",
        scheduledDate: new Date("2023-12-24T14:30:00Z"),
        scheduledStepId: "SPS-20231223-0003",
        scheduledStepDescription: "MRI Lumbar Spine",

        // Referring Physician
        referringPhysician: "dr. Budi Ortopedi, Sp.OT",
    },
];

// ===========================
// MAIN FUNCTION
// ===========================

async function testPushMWL() {
    console.log("=".repeat(60));
    console.log("🏥 MWL Push Test - Push Dummy Worklists to Orthanc");
    console.log("=".repeat(60));
    console.log();

    for (let index = 0; index < dummyWorklists.length; index++) {
        const worklist = dummyWorklists[index];
        console.log(`\n[${index + 1}/${dummyWorklists.length}] Pushing worklist...`);
        console.log("├─ Patient:", worklist.patientName);
        console.log("├─ MRN:", worklist.patientId);
        console.log("├─ Accession Number:", worklist.accessionNumber);
        console.log("├─ Procedure:", worklist.requestedProcedure);
        console.log("├─ Modality:", worklist.modality);
        console.log("├─ Scheduled:", worklist.scheduledDate.toISOString());
        console.log("└─ Station AE:", worklist.stationAETitle);

        // Push to Orthanc
        const result = await pushWorklistToOrthanc(worklist);

        if (result.success) {
            console.log("✅ SUCCESS - Instance ID:", result.instanceId);

            // Query back to verify
            console.log("🔍 Verifying worklist...");
            const queryResult = await queryWorklistByAccession(worklist.accessionNumber);

            if (queryResult.success && queryResult.data) {
                console.log("✅ Worklist verified -", queryResult.data.length, "result(s) found");
            } else {
                console.log("⚠️  Could not verify worklist:", queryResult.error);
            }
        } else {
            console.log("❌ FAILED:", result.error);
        }

        console.log();
    }

    console.log("=".repeat(60));
    console.log("✅ Test completed!");
    console.log("=".repeat(60));
    console.log();
    console.log("📋 Next Steps:");
    console.log(`1. Open Orthanc UI: ${ORTHANC_BASE_URL}`);
    console.log("2. Login with: orthanc / orthanc");
    console.log("3. Check 'All Studies' to see worklist items");
    console.log();
    console.log("🖥️  Query from Modality:");
    console.log("   Use DICOM C-FIND to query worklists");
    console.log("   AE Title: ORTHANC (default)");
    console.log(`   Host: ${ORTHANC_URL.replace(/^https?:\/\//, "")}`);
    console.log(`   Port: ${ORTHANC_DICOM_PORT} (DICOM port)`);
    console.log();
}

// ===========================
// RUN TEST
// ===========================

testPushMWL().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
});
