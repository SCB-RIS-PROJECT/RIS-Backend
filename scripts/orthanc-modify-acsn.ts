#!/usr/bin/env bun
/**
 * Orthanc PACS - Modify Accession Number Script
 * 
 * Script ini digunakan untuk mengedit Accession Number (ACSN) dari study di Orthanc PACS
 * 
 * Usage:
 *   bun run scripts/orthanc-modify-acsn.ts --study=STUDY_ID --acsn=NEW_ACCESSION_NUMBER
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
    MainDicomTags: {
        AccessionNumber?: string;
        StudyDate?: string;
        StudyDescription?: string;
        StudyInstanceUID?: string;
    };
    PatientMainDicomTags: {
        PatientID?: string;
        PatientName?: string;
    };
}

interface ModifyResponse {
    ID: string;
    Path: string;
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

// ==========================================
// MAIN FUNCTIONS
// ==========================================
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

async function searchStudyByAccessionNumber(
    accessionNumber: string,
    config: typeof ORTHANC_CONFIG | typeof PACS_ORTHANC_CONFIG
): Promise<string[]> {
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

    return result;
}

async function modifyStudyAccessionNumber(
    studyId: string,
    newAccessionNumber: string,
    config: typeof ORTHANC_CONFIG | typeof PACS_ORTHANC_CONFIG,
    additionalTags?: Record<string, string>
): Promise<ModifyResponse> {
    const modifyPayload = {
        Replace: {
            AccessionNumber: newAccessionNumber,
            ...additionalTags,
        },
        Force: true,
    };

    const result = await fetchOrthancAPI(
        config.url,
        config.port,
        `/studies/${studyId}/modify`,
        config.username,
        config.password,
        {
            method: "POST",
            body: JSON.stringify(modifyPayload),
        }
    );

    return result;
}

async function deleteStudy(
    studyId: string,
    config: typeof ORTHANC_CONFIG | typeof PACS_ORTHANC_CONFIG
): Promise<void> {
    await fetchOrthancAPI(
        config.url,
        config.port,
        `/studies/${studyId}`,
        config.username,
        config.password,
        {
            method: "DELETE",
        }
    );
}

// ==========================================
// MAIN EXECUTION
// ==========================================
async function main() {
    console.log("╔════════════════════════════════════════════════════════════════════════════╗");
    console.log("║              🏥 ORTHANC PACS - MODIFY ACCESSION NUMBER                     ║");
    console.log("╚════════════════════════════════════════════════════════════════════════════╝");

    try {
        // Parse command line arguments
        const args = process.argv.slice(2);
        const studyIdArg = args.find((arg) => arg.startsWith("--study="));
        const newAcsnArg = args.find((arg) => arg.startsWith("--acsn="));
        const oldAcsnArg = args.find((arg) => arg.startsWith("--old-acsn="));
        const usePacsArg = args.includes("--pacs");
        const deleteOldArg = args.includes("--delete-old");
        const additionalTagsArg = args.find((arg) => arg.startsWith("--tags="));

        // Validation
        if (!newAcsnArg) {
            console.error("❌ Error: --acsn parameter is required!");
            console.log("\nUsage:");
            console.log("  bun run scripts/orthanc-modify-acsn.ts --study=STUDY_ID --acsn=NEW_ACSN");
            console.log("  bun run scripts/orthanc-modify-acsn.ts --old-acsn=OLD_ACSN --acsn=NEW_ACSN");
            process.exit(1);
        }

        if (!studyIdArg && !oldAcsnArg) {
            console.error("❌ Error: Either --study or --old-acsn parameter is required!");
            console.log("\nUsage:");
            console.log("  bun run scripts/orthanc-modify-acsn.ts --study=STUDY_ID --acsn=NEW_ACSN");
            console.log("  bun run scripts/orthanc-modify-acsn.ts --old-acsn=OLD_ACSN --acsn=NEW_ACSN");
            process.exit(1);
        }

        // Select configuration
        const config = usePacsArg ? PACS_ORTHANC_CONFIG : ORTHANC_CONFIG;
        const configName = usePacsArg ? "PACS ORTHANC (Retrieve)" : "Main ORTHANC";

        console.log(`\n📡 Using: ${configName}`);
        console.log(`   URL: ${config.url}:${config.port}`);

        const newAccessionNumber = newAcsnArg.split("=")[1];
        let studyId: string;

        // Get study ID either from argument or by searching
        if (studyIdArg) {
            studyId = studyIdArg.split("=")[1];
            console.log(`\n🔍 Target Study ID: ${studyId}`);
        } else {
            const oldAccessionNumber = oldAcsnArg!.split("=")[1];
            console.log(`\n🔍 Searching for study with Accession Number: ${oldAccessionNumber}...`);

            const studyIds = await searchStudyByAccessionNumber(oldAccessionNumber, config);

            if (studyIds.length === 0) {
                console.error(`❌ No study found with Accession Number: ${oldAccessionNumber}`);
                process.exit(1);
            }

            if (studyIds.length > 1) {
                console.warn(`⚠️  Found ${studyIds.length} studies with this Accession Number!`);
                console.log("Study IDs:");
                studyIds.forEach((id, index) => {
                    console.log(`   ${index + 1}. ${id}`);
                });
                console.error("\n❌ Please specify the exact study ID using --study parameter");
                process.exit(1);
            }

            studyId = studyIds[0];
            console.log(`✅ Found study: ${studyId}`);
        }

        // Get current study details
        console.log("\n📄 Fetching current study details...");
        const currentStudy = await getStudyDetails(studyId, config);

        console.log("\n🔍 CURRENT STUDY INFORMATION:");
        console.log("═".repeat(80));
        console.log(`   Study ID               : ${currentStudy.ID}`);
        console.log(`   Study Instance UID     : ${currentStudy.MainDicomTags.StudyInstanceUID || "N/A"}`);
        console.log(`   Current Accession Number: ${currentStudy.MainDicomTags.AccessionNumber || "N/A"}`);
        console.log(`   Study Date             : ${currentStudy.MainDicomTags.StudyDate || "N/A"}`);
        console.log(`   Study Description      : ${currentStudy.MainDicomTags.StudyDescription || "N/A"}`);
        console.log(`   Patient ID             : ${currentStudy.PatientMainDicomTags.PatientID || "N/A"}`);
        console.log(`   Patient Name           : ${currentStudy.PatientMainDicomTags.PatientName || "N/A"}`);
        console.log("═".repeat(80));

        // Parse additional tags if provided
        let additionalTags: Record<string, string> | undefined;
        if (additionalTagsArg) {
            const tagsJson = additionalTagsArg.split("=")[1];
            try {
                additionalTags = JSON.parse(tagsJson);
                console.log("\n📝 Additional tags to modify:");
                Object.entries(additionalTags).forEach(([key, value]) => {
                    console.log(`   ${key}: ${value}`);
                });
            } catch (error) {
                console.error("❌ Error parsing additional tags JSON:", error);
                process.exit(1);
            }
        }

        // Modify study
        console.log(`\n🔧 Modifying Accession Number to: ${newAccessionNumber}...`);
        const modifyResult = await modifyStudyAccessionNumber(
            studyId,
            newAccessionNumber,
            config,
            additionalTags
        );

        console.log("\n✅ Study modified successfully!");
        console.log(`   New Study ID  : ${modifyResult.ID}`);
        console.log(`   Path          : ${modifyResult.Path}`);

        // Get new study details
        console.log("\n📄 Fetching modified study details...");
        const modifiedStudy = await getStudyDetails(modifyResult.ID, config);

        console.log("\n✅ MODIFIED STUDY INFORMATION:");
        console.log("═".repeat(80));
        console.log(`   Study ID               : ${modifiedStudy.ID}`);
        console.log(`   Study Instance UID     : ${modifiedStudy.MainDicomTags.StudyInstanceUID || "N/A"}`);
        console.log(`   New Accession Number   : ${modifiedStudy.MainDicomTags.AccessionNumber || "N/A"}`);
        console.log(`   Study Date             : ${modifiedStudy.MainDicomTags.StudyDate || "N/A"}`);
        console.log(`   Study Description      : ${modifiedStudy.MainDicomTags.StudyDescription || "N/A"}`);
        console.log(`   Patient ID             : ${modifiedStudy.PatientMainDicomTags.PatientID || "N/A"}`);
        console.log(`   Patient Name           : ${modifiedStudy.PatientMainDicomTags.PatientName || "N/A"}`);
        console.log("═".repeat(80));

        // Delete old study if requested
        if (deleteOldArg) {
            console.log(`\n🗑️  Deleting old study: ${studyId}...`);
            await deleteStudy(studyId, config);
            console.log("✅ Old study deleted successfully!");
        } else {
            console.log(`\n⚠️  Note: Original study still exists with ID: ${studyId}`);
            console.log("   Use --delete-old flag to delete the original study after modification");
        }

        console.log("\n🎉 Process completed successfully!\n");
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
║              🏥 ORTHANC PACS - MODIFY ACCESSION NUMBER                     ║
╚════════════════════════════════════════════════════════════════════════════╝

USAGE:
  bun run scripts/orthanc-modify-acsn.ts [options]

OPTIONS:
  --help, -h                  Show this help message
  --study=STUDY_ID            Orthanc Study ID to modify (required if not using --old-acsn)
  --old-acsn=OLD_ACSN         Search study by old Accession Number (required if not using --study)
  --acsn=NEW_ACSN             New Accession Number (required)
  --tags='{"Tag":"Value"}'    Additional DICOM tags to modify (JSON format)
  --pacs                      Use PACS Orthanc instead of main Orthanc
  --delete-old                Delete the original study after modification

EXAMPLES:
  # Modify study by Study ID
  bun run scripts/orthanc-modify-acsn.ts --study=974824e3-e4788675-6a256b5a-f3910b59-84ec63f6 --acsn=NEW-ACC-001

  # Modify study by searching with old Accession Number
  bun run scripts/orthanc-modify-acsn.ts --old-acsn=CXR-20251221-0002 --acsn=CXR-20251221-0003

  # Modify with additional DICOM tags
  bun run scripts/orthanc-modify-acsn.ts --study=STUDY_ID --acsn=NEW-ACC --tags='{"StudyDescription":"Updated Description","InstitutionName":"My Hospital"}'

  # Modify and delete original study
  bun run scripts/orthanc-modify-acsn.ts --study=STUDY_ID --acsn=NEW-ACC --delete-old

  # Use PACS Orthanc
  bun run scripts/orthanc-modify-acsn.ts --pacs --old-acsn=OLD-ACC --acsn=NEW-ACC

IMPORTANT NOTES:
  - Modifying creates a NEW study with the new Accession Number
  - Original study remains unless you use --delete-old flag
  - Force parameter is automatically set to true (required for modifying identifiers)
  - Make sure you have proper permissions to modify studies

ENVIRONMENT VARIABLES (from .env):
  ORTHANC_URL, ORTHANC_HTTP_PORT, ORTHANC_USERNAME, ORTHANC_PASSWORD
  PACS_ORTHANC_URL, PACS_ORTHANC_HTTP_PORT, PACS_ORTHANC_USERNAME, PACS_ORTHANC_PASSWORD

  `);
    process.exit(0);
}

// Run main function
main();
