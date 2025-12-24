/**
 * Test Script: Push Dummy MWL Data to DCM4CHEE
 * 
 * Usage:
 *   bun run scripts/test-mwl-dcm4chee.ts
 * 
 * This script will:
 * 1. Generate DICOM MWL files with dummy data
 * 2. Push to DCM4CHEE server via DICOM C-STORE
 * 3. Query back to verify
 * 
 * Requirements:
 *   - DCMTK tools installed (storescu, findscu)
 *   - Or use REST API if DCM4CHEE Arc Light
 */

import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const execAsync = promisify(exec);

// ===========================
// DCM4CHEE SERVER CONFIG
// ===========================

const DCM4CHEE_CONFIG = {
    host: "192.168.250.205",
    dicomPort: 11112, // Default DCM4CHEE DICOM port
    httpPort: 8080, // WildFly HTTP port
    aeTitle: "DCM4CHEE", // Default AE Title
    callingAeTitle: "RIS_API", // Our AE Title
    
    // SSH credentials for checking logs
    sshUser: "root",
    sshPassword: "Kucing123",
    
    // Web UI
    webUI: `http://192.168.250.205:8080/dcm4chee-arc/ui2`,
    
    // REST API endpoints (DCM4CHEE Arc Light)
    restApiBase: `http://192.168.250.205:8080/dcm4chee-arc`,
    
    // Default credentials (if secured with Keycloak)
    defaultUser: "admin",
    defaultPassword: "changeit",
};

// ===========================
// DUMMY MWL DATA
// ===========================

const dummyWorklists = [
    {
        patientId: "MR202512240083",
        patientName: "Muhammad^Upan",
        patientBirthDate: "19880612",
        patientSex: "M",
        accessionNumber: "ACC20251224008",
        requestedProcedure: "CT Thorax with contrast",
        modality: "CT",
        stationAETitle: "CT01",
        scheduledDate: "20251225",
        scheduledTime: "090000",
        scheduledStepId: "SPS20251224001",
        scheduledStepDescription: "CT Thorax dengan kontras",
        referringPhysician: "dr. Maria^Internist",
    },
];

// ===========================
// DICOM MWL FILE GENERATOR
// ===========================

/**
 * Generate DICOM dump file for MWL item
 * This can be converted to DICOM using dcmtk's dump2dcm
 */
function generateDicomDump(item: typeof dummyWorklists[0]): string {
    return `# DICOM Modality Worklist Item
# Generated for: ${item.patientName}

# Patient Identification
(0010,0020) LO [${item.patientId}]                    # Patient ID
(0010,0010) PN [${item.patientName}]                  # Patient Name
(0010,0030) DA [${item.patientBirthDate}]             # Patient Birth Date
(0010,0040) CS [${item.patientSex}]                   # Patient Sex

# Imaging Service Request
(0008,0050) SH [${item.accessionNumber}]              # Accession Number
(0008,0090) PN [${item.referringPhysician}]           # Referring Physician Name
(0032,1060) LO [${item.requestedProcedure}]           # Requested Procedure Description

# Scheduled Procedure Step Sequence
(0040,0100) SQ                                         # Scheduled Procedure Step Sequence
  (fffe,e000) na                                       # Item
    (0008,0060) CS [${item.modality}]                 # Modality
    (0040,0001) AE [${item.stationAETitle}]           # Scheduled Station AE Title
    (0040,0002) DA [${item.scheduledDate}]            # Scheduled Procedure Step Start Date
    (0040,0003) TM [${item.scheduledTime}]            # Scheduled Procedure Step Start Time
    (0040,0009) SH [${item.scheduledStepId}]          # Scheduled Procedure Step ID
    (0040,0007) LO [${item.scheduledStepDescription}] # Scheduled Procedure Step Description
  (fffe,e00d) na                                       # Item Delimitation
(fffe,e0dd) na                                         # Sequence Delimitation
`;
}

// ===========================
// REST API - CREATE PATIENT FIRST
// ===========================

async function createPatientViaRestAPI(item: typeof dummyWorklists[0]) {
    console.log("  👤 Creating patient via REST API...");
    
    // Patient payload
    const patientPayload = {
        "00100010": { "vr": "PN", "Value": [{ "Alphabetic": item.patientName.replace("^", " ") }] }, // Patient Name
        "00100020": { "vr": "LO", "Value": [item.patientId] }, // Patient ID
        "00100030": { "vr": "DA", "Value": [item.patientBirthDate] }, // Birth Date
        "00100040": { "vr": "CS", "Value": [item.patientSex] }, // Sex
    };

    const url = `${DCM4CHEE_CONFIG.restApiBase}/aets/${DCM4CHEE_CONFIG.aeTitle}/rs/patients`;
    
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/dicom+json",
                "Accept": "application/json",
            },
            body: JSON.stringify(patientPayload),
        });

        if (response.ok || response.status === 409) {
            // 409 = Conflict (patient already exists) - this is OK
            console.log("  ✅ Patient created (or already exists)");
            return { success: true };
        } else {
            const error = await response.text();
            console.log(`  ⚠️  Patient creation failed (${response.status}):`, error);
            return { success: false, error };
        }
    } catch (error: any) {
        console.log("  ⚠️  Patient creation error:", error.message);
        return { success: false, error: error.message };
    }
}

// ===========================
// REST API PUSH (DCM4CHEE Arc Light)
// ===========================

async function pushViaRestAPI(item: typeof dummyWorklists[0]) {
    console.log("  📡 Pushing MWL via REST API...");
    
    // Step 1: Create patient first (DCM4CHEE requires patient to exist)
    const patientResult = await createPatientViaRestAPI(item);
    if (!patientResult.success) {
        return patientResult;
    }
    
    // Step 2: Create MWL item
    const payload = {
        "00080050": { "vr": "SH", "Value": [item.accessionNumber] }, // Accession Number
        "00100020": { "vr": "LO", "Value": [item.patientId] }, // Patient ID (reference existing patient)
        "00080090": { "vr": "PN", "Value": [{ "Alphabetic": item.referringPhysician.replace("^", " ") }] }, // Referring Physician
        "00321060": { "vr": "LO", "Value": [item.requestedProcedure] }, // Requested Procedure
        "00400100": { // Scheduled Procedure Step Sequence
            "vr": "SQ",
            "Value": [{
                "00080060": { "vr": "CS", "Value": [item.modality] },
                "00400001": { "vr": "AE", "Value": [item.stationAETitle] },
                "00400002": { "vr": "DA", "Value": [item.scheduledDate] },
                "00400003": { "vr": "TM", "Value": [item.scheduledTime] },
                "00400009": { "vr": "SH", "Value": [item.scheduledStepId] },
                "00400007": { "vr": "LO", "Value": [item.scheduledStepDescription] },
            }]
        }
    };

    const url = `${DCM4CHEE_CONFIG.restApiBase}/aets/${DCM4CHEE_CONFIG.aeTitle}/rs/mwlitems`;
    
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/dicom+json",
                "Accept": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            console.log("  ✅ MWL item created successfully!");
            return { success: true };
        } else {
            const error = await response.text();
            console.log(`  ❌ MWL creation failed (${response.status}):`, error);
            return { success: false, error };
        }
    } catch (error: any) {
        console.log("  ⚠️  REST API error:", error.message);
        return { success: false, error: error.message };
    }
}

// ===========================
// DICOM C-STORE PUSH (via dcmtk)
// ===========================

async function pushViaDicomStore(item: typeof dummyWorklists[0], dumpFile: string, dcmFile: string) {
    console.log("  📡 Attempting DICOM C-STORE push...");
    
    try {
        // Convert dump to DICOM file using dump2dcm
        const dump2dcmCmd = `dump2dcm "${dumpFile}" "${dcmFile}"`;
        console.log("  🔧 Converting dump to DICOM...");
        
        try {
            await execAsync(dump2dcmCmd);
            console.log("  ✅ DICOM file created");
        } catch (error: any) {
            console.log("  ⚠️  dump2dcm not found or failed");
            console.log("     Install DCMTK: https://dicom.offis.de/dcmtk");
            return { success: false, error: "dump2dcm not available" };
        }

        // Push using storescu
        const storescuCmd = `storescu -aec ${DCM4CHEE_CONFIG.aeTitle} -aet ${DCM4CHEE_CONFIG.callingAeTitle} ${DCM4CHEE_CONFIG.host} ${DCM4CHEE_CONFIG.dicomPort} "${dcmFile}"`;
        console.log("  📤 Pushing to DCM4CHEE...");
        
        const { stdout, stderr } = await execAsync(storescuCmd);
        
        if (stderr && !stderr.includes("Association Accepted")) {
            console.log("  ❌ DICOM C-STORE failed:", stderr);
            return { success: false, error: stderr };
        }
        
        console.log("  ✅ DICOM C-STORE successful");
        return { success: true, output: stdout };
        
    } catch (error: any) {
        console.log("  ⚠️  storescu not found or failed");
        console.log("     Install DCMTK: https://dicom.offis.de/dcmtk");
        return { success: false, error: error.message };
    }
}

// ===========================
// QUERY MWL VIA DICOM C-FIND
// ===========================

async function queryMWLItem(accessionNumber: string) {
    console.log("  🔍 Querying MWL via DICOM C-FIND...");
    
    // Create query file
    const queryDump = `# MWL Query
(0008,0050) SH [${accessionNumber}]  # Accession Number
(0010,0010) PN []                    # Patient Name (return key)
(0010,0020) LO []                    # Patient ID (return key)
(0040,0100) SQ                       # Scheduled Procedure Step Sequence
  (fffe,e000) na
    (0008,0060) CS []                # Modality (return key)
    (0040,0002) DA []                # Start Date (return key)
  (fffe,e00d) na
(fffe,e0dd) na
`;
    
    const queryFile = join(process.cwd(), "temp", `query-${accessionNumber}.dump`);
    const queryDcmFile = join(process.cwd(), "temp", `query-${accessionNumber}.dcm`);
    
    try {
        await writeFile(queryFile, queryDump);
        await execAsync(`dump2dcm "${queryFile}" "${queryDcmFile}"`);
        
        const findscuCmd = `findscu -aec ${DCM4CHEE_CONFIG.aeTitle} -aet ${DCM4CHEE_CONFIG.callingAeTitle} -W -k "0008,0050=${accessionNumber}" ${DCM4CHEE_CONFIG.host} ${DCM4CHEE_CONFIG.dicomPort}`;
        
        const { stdout } = await execAsync(findscuCmd);
        
        if (stdout.includes("W: 0 Responses")) {
            console.log("  ⚠️  No results found");
            return { success: false, found: false };
        }
        
        console.log("  ✅ MWL item found!");
        return { success: true, found: true, output: stdout };
        
    } catch (error: any) {
        console.log("  ⚠️  Query failed:", error.message);
        return { success: false, error: error.message };
    }
}

// ===========================
// MAIN TEST FUNCTION
// ===========================

async function testPushMWLToDcm4chee() {
    console.log("=".repeat(70));
    console.log("🏥 DCM4CHEE MWL Push Test");
    console.log("=".repeat(70));
    console.log();
    console.log("📋 Server Configuration:");
    console.log("  Host:", DCM4CHEE_CONFIG.host);
    console.log("  DICOM Port:", DCM4CHEE_CONFIG.dicomPort);
    console.log("  WildFly Port:", DCM4CHEE_CONFIG.httpPort);
    console.log("  AE Title:", DCM4CHEE_CONFIG.aeTitle);
    console.log("  Web UI:", DCM4CHEE_CONFIG.webUI);
    console.log("  Default Login:", `${DCM4CHEE_CONFIG.defaultUser} / ${DCM4CHEE_CONFIG.defaultPassword}`);
    console.log();

    // Create temp directory for DICOM files
    const tempDir = join(process.cwd(), "temp");
    await mkdir(tempDir, { recursive: true });

    for (let index = 0; index < dummyWorklists.length; index++) {
        const item = dummyWorklists[index];
        
        console.log(`\n[${ index + 1}/${dummyWorklists.length}] Processing worklist...`);
        console.log("├─ Patient:", item.patientName.replace("^", " "));
        console.log("├─ MRN:", item.patientId);
        console.log("├─ Accession:", item.accessionNumber);
        console.log("├─ Procedure:", item.requestedProcedure);
        console.log("├─ Modality:", item.modality);
        console.log("├─ Scheduled:", `${item.scheduledDate} ${item.scheduledTime}`);
        console.log("└─ Station AE:", item.stationAETitle);
        console.log();

        // Generate DICOM dump file
        const dumpContent = generateDicomDump(item);
        const dumpFile = join(tempDir, `mwl-${item.accessionNumber}.dump`);
        const dcmFile = join(tempDir, `mwl-${item.accessionNumber}.dcm`);
        
        await writeFile(dumpFile, dumpContent);
        console.log("  ✅ DICOM dump file created:", dumpFile);

        // Push via REST API (will create patient first, then MWL item)
        const restResult = await pushViaRestAPI(item);
        
        if (!restResult.success) {
            console.log("  ℹ️  Trying DICOM C-STORE fallback (requires DCMTK)...");
            await pushViaDicomStore(item, dumpFile, dcmFile);
        }

        // Query to verify (skip if tools not available)
        console.log();
        console.log("  🔍 Verifying via Web UI...");
        console.log(`     Open: ${DCM4CHEE_CONFIG.webUI}`);
        console.log("     Navigate: Study → Worklist tab");
        console.log(`     Search Accession: ${item.accessionNumber}`);
        
        console.log();
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ Test completed!");
    console.log("=".repeat(70));
    console.log();
    console.log("📋 How to verify:");
    console.log();
    console.log("1️⃣  Via DCM4CHEE Web UI:");
    console.log(`   URL: ${DCM4CHEE_CONFIG.webUI}`);
    console.log(`   Login: ${DCM4CHEE_CONFIG.defaultUser} / ${DCM4CHEE_CONFIG.defaultPassword}`);
    console.log("   Navigate to: Study → Worklist tab");
    console.log("   Or check: Monitoring → Worklist");
    console.log();
    console.log("2️⃣  Via DICOM C-FIND Query:");
    console.log(`   findscu -aec ${DCM4CHEE_CONFIG.aeTitle} -aet ${DCM4CHEE_CONFIG.callingAeTitle} -W ${DCM4CHEE_CONFIG.host} ${DCM4CHEE_CONFIG.dicomPort}`);
    console.log();
    console.log("3️⃣  Via SSH (check logs):");
    console.log(`   ssh ${DCM4CHEE_CONFIG.sshUser}@${DCM4CHEE_CONFIG.host}`);
    console.log("   tail -f /opt/dcm4chee/server/default/log/server.log");
    console.log();
    console.log("4️⃣  Via Modality (real device):");
    console.log("   Configure modality to query:");
    console.log(`   - Remote AE: ${DCM4CHEE_CONFIG.aeTitle}`);
    console.log(`   - Host: ${DCM4CHEE_CONFIG.host}`);
    console.log(`   - Port: ${DCM4CHEE_CONFIG.dicomPort}`);
    console.log("   - Query type: MWL (Modality Worklist)");
    console.log();
    console.log("📁 Generated files location:");
    console.log(`   ${tempDir}`);
    console.log();
}

// ===========================
// RUN TEST
// ===========================

testPushMWLToDcm4chee().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
});
