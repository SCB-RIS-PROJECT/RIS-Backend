#!/usr/bin/env bun
/**
 * Orthanc PACS - Get All Studies Script
 * 
 * Script ini digunakan untuk mengambil semua data studies dari Orthanc PACS
 * dan menampilkan informasi detail dari setiap study.
 * 
 * Usage:
 *   bun run scripts/orthanc-get-studies.ts
 */

// Bun automatically loads .env file, no need for dotenv package

// ==========================================
// CONFIGURATION FROM ENV
// ==========================================
const ORTHANC_CONFIG = {
    url: Bun.env.ORTHANC_URL || "http://192.168.251.202",
    port: Bun.env.ORTHANC_HTTP_PORT || "8042",
    username: Bun.env.ORTHANC_USERNAME || "rsba",
    password: Bun.env.ORTHANC_PASSWORD || "rsba",
    authEnabled: Bun.env.ORTHANC_AUTHENTICATION_ENABLED === "true",
};

const PACS_ORTHANC_CONFIG = {
    url: Bun.env.PACS_ORTHANC_URL || "http://192.168.251.202",
    port: Bun.env.PACS_ORTHANC_HTTP_PORT || "8042",
    username: Bun.env.PACS_ORTHANC_USERNAME || "rsba",
    password: Bun.env.PACS_ORTHANC_PASSWORD || "rsba",
};

// ==========================================
// TYPES
// ==========================================
interface OrthancStudy {
    ID: string;
    IsStable: boolean;
    LastUpdate: string;
    MainDicomTags: {
        AccessionNumber?: string;
        InstitutionName?: string;
        ReferringPhysicianName?: string;
        RequestingPhysician?: string;
        PerformingPhysicianName?: string;
        StudyDate?: string;
        StudyDescription?: string;
        StudyID?: string;
        StudyInstanceUID?: string;
        StudyTime?: string;
    };
    ParentPatient: string;
    PatientMainDicomTags: {
        PatientBirthDate?: string;
        PatientID?: string;
        PatientName?: string;
        PatientSex?: string;
    };
    Series: string[];
    Type: "Study";
}

interface OrthancSeries {
    ID: string;
    MainDicomTags: {
        Modality?: string;
        SeriesDescription?: string;
        SeriesInstanceUID?: string;
        SeriesNumber?: string;
        PerformedProcedureStepDescription?: string;
        BodyPartExamined?: string;
        ProtocolName?: string;
    };
    Instances: string[];
    ParentStudy: string;
    Status: string;
}

interface SimplifiedDicomTag {
    Name: string;
    Type: string;
    Value: any;
}

interface FullDicomTags {
    [key: string]: {
        Name: string;
        Type: string;
        Value: any;
    };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function createAuthHeader(username: string, password: string): string {
    const credentials = Buffer.from(`${username}:${password}`).toString("base64");
    return `Basic ${credentials}`;
}

async function fetchOrthancAPI(
    baseUrl: string,
    port: string,
    endpoint: string,
    username: string,
    password: string,
    options: RequestInit = {}
): Promise<any> {
    const url = `${baseUrl}:${port}${endpoint}`;
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        Authorization: createAuthHeader(username, password),
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...(options.headers || {}),
            },
        });

        if (!response.ok) {
            throw new Error(
                `HTTP Error! Status: ${response.status} - ${response.statusText}`
            );
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return await response.json();
        }

        return await response.text();
    } catch (error) {
        console.error(`❌ Error fetching ${url}:`, error);
        throw error;
    }
}

function formatDate(dateStr?: string): string {
    if (!dateStr) return "N/A";
    // DICOM date format: YYYYMMDD
    if (dateStr.length === 8) {
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
}

function formatTime(timeStr?: string): string {
    if (!timeStr) return "N/A";
    // DICOM time format: HHMMSS.FFFFFF
    if (timeStr.length >= 6) {
        return `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}:${timeStr.substring(4, 6)}`;
    }
    return timeStr;
}

// ==========================================
// MAIN FUNCTIONS
// ==========================================
async function getAllStudyIDs(
    config: typeof ORTHANC_CONFIG | typeof PACS_ORTHANC_CONFIG
): Promise<string[]> {
    console.log(`\n📋 Fetching all study IDs from ${config.url}:${config.port}...`);

    const studyIds = await fetchOrthancAPI(
        config.url,
        config.port,
        "/studies",
        config.username,
        config.password
    );

    console.log(`✅ Found ${studyIds.length} studies`);
    return studyIds;
}

async function getStudyDetails(
    studyId: string,
    config: typeof ORTHANC_CONFIG | typeof PACS_ORTHANC_CONFIG
): Promise<OrthancStudy> {
    return await fetchOrthancAPI(
        config.url,
        config.port,
        `/studies/${studyId}`,
        config.username,
        config.password
    );
}

async function getSeriesDetails(
    seriesId: string,
    config: typeof ORTHANC_CONFIG | typeof PACS_ORTHANC_CONFIG
): Promise<OrthancSeries> {
    return await fetchOrthancAPI(
        config.url,
        config.port,
        `/series/${seriesId}`,
        config.username,
        config.password
    );
}

async function getFullDicomTags(
    studyId: string,
    config: typeof ORTHANC_CONFIG | typeof PACS_ORTHANC_CONFIG
): Promise<FullDicomTags> {
    return await fetchOrthancAPI(
        config.url,
        config.port,
        `/studies/${studyId}/instances`,
        config.username,
        config.password
    ).then(async (instances) => {
        if (instances.length > 0) {
            // Get simplified tags from first instance
            return await fetchOrthancAPI(
                config.url,
                config.port,
                `/instances/${instances[0].ID}/simplified-tags`,
                config.username,
                config.password
            );
        }
        return {};
    });
}

async function displayStudyInfo(
    study: OrthancStudy,
    index: number,
    total: number,
    config: typeof ORTHANC_CONFIG | typeof PACS_ORTHANC_CONFIG,
    showDetailed: boolean = false
) {
    console.log("\n" + "=".repeat(80));
    console.log(`📊 STUDY ${index + 1} of ${total}`);
    console.log("=".repeat(80));

    console.log("\n🏥 STUDY INFORMATION:");
    console.log(`   Orthanc ID         : ${study.ID}`);
    console.log(`   Study Instance UID : ${study.MainDicomTags.StudyInstanceUID || "N/A"}`);
    console.log(`   Accession Number   : ${study.MainDicomTags.AccessionNumber || "N/A"}`);
    console.log(`   Study ID           : ${study.MainDicomTags.StudyID || "N/A"}`);
    console.log(`   Study Date         : ${formatDate(study.MainDicomTags.StudyDate)}`);
    console.log(`   Study Time         : ${formatTime(study.MainDicomTags.StudyTime)}`);
    console.log(`   Study Description  : ${study.MainDicomTags.StudyDescription || "N/A"}`);
    console.log(`   Institution        : ${study.MainDicomTags.InstitutionName || "N/A"}`);
    console.log(`   Referring Physician: ${study.MainDicomTags.ReferringPhysicianName || "N/A"}`);
    console.log(`   Requesting Physician: ${study.MainDicomTags.RequestingPhysician || "N/A"}`);
    console.log(`   Performing Physician: ${study.MainDicomTags.PerformingPhysicianName || "N/A"}`);

    console.log("\n👤 PATIENT INFORMATION:");
    console.log(`   Patient ID         : ${study.PatientMainDicomTags.PatientID || "N/A"}`);
    console.log(`   Patient Name       : ${study.PatientMainDicomTags.PatientName || "N/A"}`);
    console.log(`   Patient Birth Date : ${formatDate(study.PatientMainDicomTags.PatientBirthDate)}`);
    console.log(`   Patient Sex        : ${study.PatientMainDicomTags.PatientSex || "N/A"}`);

    // Get Series Information (untuk melihat Modality)
    if (showDetailed && study.Series.length > 0) {
        console.log("\n📋 SERIES INFORMATION:");
        for (let i = 0; i < study.Series.length; i++) {
            try {
                const series = await getSeriesDetails(study.Series[i], config);
                const seriesNum = i + 1;
                console.log(`\n   Series ${seriesNum}:`);
                console.log(`     ├─ Series ID           : ${series.ID}`);
                console.log(`     ├─ Modality            : ${series.MainDicomTags.Modality || "N/A"}`);
                console.log(`     ├─ Series Description  : ${series.MainDicomTags.SeriesDescription || "N/A"}`);
                console.log(`     ├─ Series Number       : ${series.MainDicomTags.SeriesNumber || "N/A"}`);
                console.log(`     ├─ Body Part Examined  : ${series.MainDicomTags.BodyPartExamined || "N/A"}`);
                console.log(`     ├─ Protocol Name       : ${series.MainDicomTags.ProtocolName || "N/A"}`);
                console.log(`     ├─ Performed Procedure : ${series.MainDicomTags.PerformedProcedureStepDescription || "N/A"}`);
                console.log(`     └─ Total Instances     : ${series.Instances.length}`);
            } catch (error) {
                console.log(`     └─ Error fetching series details`);
            }
        }

        // Get Full DICOM Tags for LOINC and other codes
        try {
            console.log("\n🔬 DETAILED DICOM INFORMATION:");
            const fullTags = await getFullDicomTags(study.ID, config);

            // Requested Procedure Code Sequence (biasanya berisi LOINC)
            if (fullTags.RequestedProcedureCodeSequence) {
                console.log(`   Requested Procedure Code: ${JSON.stringify(fullTags.RequestedProcedureCodeSequence)}`);
            }

            // Procedure Code Sequence
            if (fullTags.ProcedureCodeSequence) {
                console.log(`   Procedure Code Sequence : ${JSON.stringify(fullTags.ProcedureCodeSequence)}`);
            }

            // Operators Name (Performer)
            if (fullTags.OperatorsName) {
                console.log(`   Operators Name          : ${fullTags.OperatorsName}`);
            }

            // Name of Physicians Reading Study
            if (fullTags.NameOfPhysiciansReadingStudy) {
                console.log(`   Reading Physician       : ${fullTags.NameOfPhysiciansReadingStudy}`);
            }

            // Requested Procedure Description
            if (fullTags.RequestedProcedureDescription) {
                console.log(`   Requested Procedure     : ${fullTags.RequestedProcedureDescription}`);
            }

            // Performed Procedure Step Description
            if (fullTags.PerformedProcedureStepDescription) {
                console.log(`   Performed Procedure     : ${fullTags.PerformedProcedureStepDescription}`);
            }
        } catch (error) {
            console.log(`   └─ Error fetching detailed DICOM tags`);
        }
    }

    console.log("\n📁 METADATA:");
    console.log(`   Total Series       : ${study.Series.length}`);
    console.log(`   Is Stable          : ${study.IsStable ? "✅ Yes" : "❌ No"}`);
    console.log(`   Last Update        : ${study.LastUpdate}`);
    console.log(`   Parent Patient ID  : ${study.ParentPatient}`);
}

async function searchStudyByAccessionNumber(
    accessionNumber: string,
    config: typeof ORTHANC_CONFIG | typeof PACS_ORTHANC_CONFIG
): Promise<string[]> {
    console.log(`\n🔍 Searching for studies with Accession Number: ${accessionNumber}...`);

    const result = await fetchOrthancAPI(
        config.url,
        config.port,
        "/tools/find",
        config.username,
        config.password,
        {
            method: "POST",
            body: JSON.stringify({
                Level: "Study",
                Query: {
                    AccessionNumber: accessionNumber,
                },
            }),
        }
    );

    console.log(`✅ Found ${result.length} matching studies`);
    return result;
}

// ==========================================
// MAIN EXECUTION
// ==========================================
async function main() {
    console.log("╔════════════════════════════════════════════════════════════════════════════╗");
    console.log("║                 🏥 ORTHANC PACS - GET ALL STUDIES                          ║");
    console.log("╚════════════════════════════════════════════════════════════════════════════╝");

    try {
        // Pilih konfigurasi yang akan digunakan
        const useMainOrthanc = process.argv.includes("--main");
        const usePacsOrthanc = process.argv.includes("--pacs");
        const searchMode = process.argv.find(arg => arg.startsWith("--search="));
        const detailedMode = process.argv.includes("--detailed");

        let config: typeof ORTHANC_CONFIG | typeof PACS_ORTHANC_CONFIG;
        let configName: string;

        if (usePacsOrthanc) {
            config = PACS_ORTHANC_CONFIG;
            configName = "PACS ORTHANC (Retrieve)";
        } else {
            config = ORTHANC_CONFIG;
            configName = "Main ORTHANC";
        }

        console.log(`\n📡 Using: ${configName}`);
        console.log(`   URL      : ${config.url}:${config.port}`);
        console.log(`   Username : ${config.username}`);
        console.log(`   Password : ${"*".repeat(config.password.length)}`);

        // Mode: Search by Accession Number
        if (searchMode) {
            const accessionNumber = searchMode.split("=")[1];
            const studyIds = await searchStudyByAccessionNumber(accessionNumber, config);

            if (studyIds.length === 0) {
                console.log("\n⚠️  No studies found with this Accession Number");
                return;
            }

            for (let i = 0; i < studyIds.length; i++) {
                const study = await getStudyDetails(studyIds[i], config);
                await displayStudyInfo(study, i, studyIds.length, config, detailedMode);
            }

            return;
        }

        // Mode: Get All Studies
        const studyIds = await getAllStudyIDs(config);

        if (studyIds.length === 0) {
            console.log("\n⚠️  No studies found in Orthanc PACS");
            return;
        }

        // Get detail for limited number of studies (default: show all)
        const limit = process.argv.find(arg => arg.startsWith("--limit="));
        const maxStudies = limit ? parseInt(limit.split("=")[1]) : studyIds.length;
        const studiesToShow = studyIds.slice(0, maxStudies);

        console.log(`\n📊 Fetching details for ${studiesToShow.length} studies...`);

        for (let i = 0; i < studiesToShow.length; i++) {
            const study = await getStudyDetails(studiesToShow[i], config);
            await displayStudyInfo(study, i, studiesToShow.length, config, detailedMode);
        }

        // Summary
        console.log("\n" + "=".repeat(80));
        console.log("📈 SUMMARY");
        console.log("=".repeat(80));
        console.log(`   Total Studies in PACS : ${studyIds.length}`);
        console.log(`   Studies Displayed     : ${studiesToShow.length}`);
        console.log(`   Source                : ${configName}`);
        console.log("=".repeat(80));

        console.log("\n✅ Script completed successfully!\n");
    } catch (error) {
        console.error("\n❌ Error occurred:", error);
        process.exit(1);
    }
}

// ==========================================
// HELP
// ==========================================
if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                 🏥 ORTHANC PACS - GET ALL STUDIES                          ║
╚════════════════════════════════════════════════════════════════════════════╝

USAGE:
  bun run scripts/orthanc-get-studies.ts [options]

OPTIONS:
  --help, -h          Show this help message
  --main              Use main Orthanc (default: ${ORTHANC_CONFIG.url}:${ORTHANC_CONFIG.port})
  --pacs              Use PACS Orthanc (${PACS_ORTHANC_CONFIG.url}:${PACS_ORTHANC_CONFIG.port})
  --limit=N           Limit number of studies to display (default: all)
  --search=ACC123     Search studies by Accession Number

EXAMPLES:
  # Get all studies from main Orthanc
  bun run scripts/orthanc-get-studies.ts

  # Get all studies from PACS Orthanc
  bun run scripts/orthanc-get-studies.ts --pacs

  # Get only first 5 studies
  bun run scripts/orthanc-get-studies.ts --limit=5

  # Search by Accession Number
  bun run scripts/orthanc-get-studies.ts --search=ACC123456

ENVIRONMENT VARIABLES (from .env):
  ORTHANC_URL, ORTHANC_HTTP_PORT, ORTHANC_USERNAME, ORTHANC_PASSWORD
  PACS_ORTHANC_URL, PACS_ORTHANC_HTTP_PORT, PACS_ORTHANC_USERNAME, PACS_ORTHANC_PASSWORD

  `);
    process.exit(0);
}

// Run main function
main();
