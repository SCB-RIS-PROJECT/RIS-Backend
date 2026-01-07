#!/usr/bin/env bun
/**
 * Test PACS Orthanc Integration
 * 
 * Test flow:
 * 1. Test koneksi ke PACS
 * 2. Query studies berdasarkan ACSN
 * 3. Update order dengan PACS URL
 */

const BASE_URL = "http://localhost:8001";

// Ganti dengan token yang valid
const AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmMDFlYTliZi1mODdlLTQwMTYtOTk0ZC0zZTYxYzAwYmE3NzIiLCJlbWFpbCI6ImFkbWluQGFkbWluLmNvbSIsImlhdCI6MTc2Nzc2MzQxOSwiZXhwIjoxNzY4MzY4MjE5LCJhdWQiOiJyaXMtY2xpZW50IiwiaXNzIjoicmlzLWFwaSJ9.QouCcTs4NkQ1hg7LYBkmRGP-KmGVWuko3l6gXzgQGCg";

// Ganti dengan accession number yang ada di PACS
const TEST_ACCESSION_NUMBER = "2601031058321"; 

console.log("=".repeat(60));
console.log("TEST PACS ORTHANC INTEGRATION");
console.log("=".repeat(60));

async function testPACSConnection() {
    console.log("\n1. Testing PACS Connection...");
    console.log("-".repeat(60));
    
    try {
        const response = await fetch(`${BASE_URL}/api/orders/pacs/test`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${AUTH_TOKEN}`,
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log("✅ PACS Connection: SUCCESS");
            console.log("   PACS Name:", data.data?.name);
            console.log("   PACS Version:", data.data?.version);
            console.log("   PACS URL:", data.data?.url);
            return true;
        } else {
            console.log("❌ PACS Connection: FAILED");
            console.log("   Error:", data.message);
            return false;
        }
    } catch (error) {
        console.log("❌ PACS Connection: ERROR");
        console.log("   Error:", error instanceof Error ? error.message : String(error));
        return false;
    }
}

async function fetchStudyFromPACS(accessionNumber: string) {
    console.log("\n2. Fetching Study from PACS...");
    console.log("-".repeat(60));
    console.log("   Accession Number:", accessionNumber);
    
    try {
        const response = await fetch(`${BASE_URL}/api/orders/pacs/fetch/${accessionNumber}`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${AUTH_TOKEN}`,
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log("✅ Fetch Study: SUCCESS");
            console.log("   Detail ID:", data.data?.detail_id);
            console.log("   Accession Number:", data.data?.accession_number);
            console.log("   PACS Study URL:", data.data?.pacs_study_url);
            console.log("\n   Study Data:");
            console.log("   - Study ID:", data.data?.study_data?.studyId);
            console.log("   - Study Instance UID:", data.data?.study_data?.studyInstanceUID);
            console.log("   - Patient ID:", data.data?.study_data?.patientId);
            console.log("   - Patient Name:", data.data?.study_data?.patientName);
            console.log("   - Study Date:", data.data?.study_data?.studyDate);
            console.log("   - Modalities:", data.data?.study_data?.modalities);
            console.log("   - Number of Series:", data.data?.study_data?.numberOfSeries);
            console.log("   - Number of Instances:", data.data?.study_data?.numberOfInstances);
            console.log("   - Viewer URL:", data.data?.study_data?.viewerUrl);
            return true;
        } else {
            console.log("❌ Fetch Study: FAILED");
            console.log("   Status:", response.status);
            console.log("   Error:", data.message);
            return false;
        }
    } catch (error) {
        console.log("❌ Fetch Study: ERROR");
        console.log("   Error:", error instanceof Error ? error.message : String(error));
        return false;
    }
}

async function main() {
    // Test 1: Connection test
    const connectionOk = await testPACSConnection();
    
    if (!connectionOk) {
        console.log("\n⚠️  PACS connection failed. Please check:");
        console.log("   - PACS_ORTHANC_URL is correct in .env");
        console.log("   - PACS Orthanc server is running");
        console.log("   - Network connectivity");
        process.exit(1);
    }

    // Test 2: Fetch study
    console.log("\n");
    const fetchOk = await fetchStudyFromPACS(TEST_ACCESSION_NUMBER);
    
    if (!fetchOk) {
        console.log("\n⚠️  Failed to fetch study. Please check:");
        console.log("   - Accession number exists in PACS");
        console.log("   - Order with this ACSN exists in RIS database");
        process.exit(1);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ ALL TESTS PASSED!");
    console.log("=".repeat(60));
    console.log("\nNext steps:");
    console.log("1. Update TEST_ACCESSION_NUMBER with actual ACSN from PACS");
    console.log("2. Make sure you have valid AUTH_TOKEN");
    console.log("3. Create order with matching ACSN in RIS");
    console.log("4. Run this test again");
}

main().catch(console.error);
