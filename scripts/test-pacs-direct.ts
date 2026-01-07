#!/usr/bin/env bun
/**
 * Test PACS Orthanc Direct (tanpa API endpoint)
 * Test langsung ke library pacs-orthanc.ts
 */

import { testPACSConnection, queryStudiesFromPACS } from "../src/lib/pacs-orthanc";

// Ganti dengan accession number yang ada di PACS
const TEST_ACCESSION_NUMBER = "2601031058321";

console.log("=".repeat(60));
console.log("TEST PACS ORTHANC DIRECT");
console.log("=".repeat(60));

async function main() {
    // Test 1: Connection test
    console.log("\n1. Testing PACS Connection...");
    console.log("-".repeat(60));
    
    const connectionResult = await testPACSConnection();
    
    if (connectionResult.success && connectionResult.data) {
        console.log("✅ PACS Connection: SUCCESS");
        console.log("   PACS Name:", connectionResult.data.name);
        console.log("   PACS Version:", connectionResult.data.version);
        console.log("   PACS URL:", connectionResult.data.url);
    } else {
        console.log("❌ PACS Connection: FAILED");
        console.log("   Error:", connectionResult.error);
        console.log("\n⚠️  PACS connection failed. Please check:");
        console.log("   - PACS_ORTHANC_URL is correct in .env");
        console.log("   - PACS_ORTHANC_USERNAME and PASSWORD are correct (rsba/rsba)");
        console.log("   - PACS Orthanc server is running");
        console.log("   - Network connectivity");
        process.exit(1);
    }

    // Test 2: Query studies
    console.log("\n2. Querying Studies from PACS...");
    console.log("-".repeat(60));
    console.log("   Accession Number:", TEST_ACCESSION_NUMBER);
    
    const queryResult = await queryStudiesFromPACS({
        accessionNumber: TEST_ACCESSION_NUMBER,
    });
    
    if (queryResult.success && queryResult.data && queryResult.data.length > 0) {
        console.log("✅ Query Studies: SUCCESS");
        console.log("   Found", queryResult.data.length, "study/studies\n");
        
        queryResult.data.forEach((study, index) => {
            console.log(`   Study ${index + 1}:`);
            console.log("   - Study ID:", study.studyId);
            console.log("   - Study Instance UID:", study.studyInstanceUID);
            console.log("   - Accession Number:", study.accessionNumber);
            console.log("   - Patient ID:", study.patientId);
            console.log("   - Patient Name:", study.patientName);
            console.log("   - Study Date:", study.studyDate);
            console.log("   - Study Description:", study.studyDescription);
            console.log("   - Modalities:", study.modalities);
            console.log("   - Number of Series:", study.numberOfSeries);
            console.log("   - Number of Instances:", study.numberOfInstances);
            console.log("   - Study URL:", study.studyUrl);
            console.log("   - Viewer URL:", study.viewerUrl);
            console.log("");
        });
    } else if (queryResult.success && queryResult.data && queryResult.data.length === 0) {
        console.log("⚠️  Query Studies: NO RESULTS");
        console.log("   No studies found with accession number:", TEST_ACCESSION_NUMBER);
        console.log("\n   Please check:");
        console.log("   - ACSN exists in PACS");
        console.log("   - ACSN spelling is correct");
    } else {
        console.log("❌ Query Studies: FAILED");
        console.log("   Error:", queryResult.error);
        process.exit(1);
    }

    console.log("=".repeat(60));
    console.log("✅ ALL TESTS PASSED!");
    console.log("=".repeat(60));
    console.log("\nNext steps:");
    console.log("1. Create order in RIS with this ACSN");
    console.log("2. Call API endpoint: POST /api/orders/pacs/fetch/" + TEST_ACCESSION_NUMBER);
    console.log("3. Check tb_detail_order.pacs_study_url column");
}

main().catch((error) => {
    console.error("\n❌ TEST FAILED WITH EXCEPTION:");
    console.error(error);
    process.exit(1);
});
