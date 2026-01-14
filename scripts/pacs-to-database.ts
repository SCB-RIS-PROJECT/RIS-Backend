#!/usr/bin/env bun
/**
 * PACS to Database Import Script
 * 
 * Script ini digunakan untuk mengambil data dari Orthanc PACS
 * dan membuat Order + Detail Order untuk setiap study yang ada.
 * 
 * Usage:
 *   bun run scripts/pacs-to-database.ts [options]
 * 
 * Options:
 *   --limit=N    Limit number of studies to import (default: all)
 *   --dry-run    Print what would be inserted without actually inserting
 *   --verbose    Show detailed information during import
 */

import db from "../src/database/db";
import { orderTable, detailOrderTable } from "../src/database/schemas/schema-order";
import { patientTable } from "../src/database/schemas/schema-patient";
import { modalityTable } from "../src/database/schemas/schema-modality";
import { eq } from "drizzle-orm";

// ==========================================
// CONFIGURATION FROM ENV
// ==========================================
const ORTHANC_CONFIG = {
    url: Bun.env.ORTHANC_URL || "http://192.168.251.202",
    port: Bun.env.ORTHANC_HTTP_PORT || "8042",
    username: Bun.env.ORTHANC_USERNAME || "rsba",
    password: Bun.env.ORTHANC_PASSWORD || "rsba",
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
}

function formatDate(dateStr?: string): string | null {
    if (!dateStr) return null;
    // DICOM date format: YYYYMMDD -> YYYY-MM-DD
    if (dateStr.length === 8) {
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
}

function formatDicomName(name?: string): string | null {
    if (!name) return null;
    // DICOM name format: Last^First^Middle
    return name.replace(/\^/g, " ").trim();
}

function parseGender(sex?: string): string | null {
    if (!sex) return null;
    const sexUpper = sex.toUpperCase();
    if (sexUpper === "M" || sexUpper === "MALE") return "L";
    if (sexUpper === "F" || sexUpper === "FEMALE") return "P";
    return null;
}

function calculateAge(birthDate?: string): number | null {
    if (!birthDate) return null;
    const formatted = formatDate(birthDate);
    if (!formatted) return null;

    const birth = new Date(formatted);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

// ==========================================
// PACS DATA RETRIEVAL
// ==========================================
async function getAllStudyIDs(): Promise<string[]> {
    console.log(`\n📋 Fetching all study IDs from PACS...`);
    const studyIds = await fetchOrthancAPI(
        ORTHANC_CONFIG.url,
        ORTHANC_CONFIG.port,
        "/studies",
        ORTHANC_CONFIG.username,
        ORTHANC_CONFIG.password
    );
    console.log(`✅ Found ${studyIds.length} studies in PACS`);
    return studyIds;
}

async function getStudyDetails(studyId: string): Promise<OrthancStudy> {
    return await fetchOrthancAPI(
        ORTHANC_CONFIG.url,
        ORTHANC_CONFIG.port,
        `/studies/${studyId}`,
        ORTHANC_CONFIG.username,
        ORTHANC_CONFIG.password
    );
}

async function getSeriesDetails(seriesId: string): Promise<OrthancSeries> {
    return await fetchOrthancAPI(
        ORTHANC_CONFIG.url,
        ORTHANC_CONFIG.port,
        `/series/${seriesId}`,
        ORTHANC_CONFIG.username,
        ORTHANC_CONFIG.password
    );
}

async function getFullDicomTags(studyId: string): Promise<FullDicomTags> {
    return await fetchOrthancAPI(
        ORTHANC_CONFIG.url,
        ORTHANC_CONFIG.port,
        `/studies/${studyId}/instances`,
        ORTHANC_CONFIG.username,
        ORTHANC_CONFIG.password
    ).then(async (instances) => {
        if (instances.length > 0) {
            return await fetchOrthancAPI(
                ORTHANC_CONFIG.url,
                ORTHANC_CONFIG.port,
                `/instances/${instances[0].ID}/simplified-tags`,
                ORTHANC_CONFIG.username,
                ORTHANC_CONFIG.password
            );
        }
        return {};
    });
}

// ==========================================
// MODALITY MAPPING
// ==========================================
const modalityCache = new Map<string, string>();

async function getModalityId(modalityCode: string): Promise<string | null> {
    if (!modalityCode || modalityCode === "N/A") return null;

    // Check cache first
    if (modalityCache.has(modalityCode)) {
        return modalityCache.get(modalityCode) || null;
    }

    // Query database
    try {
        const result = await db.select()
            .from(modalityTable)
            .where(eq(modalityTable.code, modalityCode))
            .limit(1);

        if (result.length > 0) {
            modalityCache.set(modalityCode, result[0].id);
            return result[0].id;
        }
    } catch (error) {
        // Modality not found
    }

    return null;
}

// ==========================================
// DATABASE IMPORT FUNCTIONS
// ==========================================
async function importStudyToDatabase(
    study: OrthancStudy,
    dryRun: boolean,
    verbose: boolean
): Promise<{ success: boolean; message: string }> {
    try {
        const accessionNumber = study.MainDicomTags.AccessionNumber;

        if (!accessionNumber) {
            return {
                success: false,
                message: "No Accession Number found"
            };
        }

        // Get series information for Modality
        let modalityCode = "";
        let modalityId: string | null = null;

        if (study.Series.length > 0) {
            try {
                const series = await getSeriesDetails(study.Series[0]);
                modalityCode = series.MainDicomTags.Modality || "";

                // Lookup modality ID
                if (modalityCode) {
                    modalityId = await getModalityId(modalityCode);
                }
            } catch (error) {
                if (verbose) console.log(`   ⚠️  Could not fetch series modality`);
            }
        }

        // Prepare data for ORDER
        const orderData = {
            patient_name: formatDicomName(study.PatientMainDicomTags.PatientName),
            patient_mrn: study.PatientMainDicomTags.PatientID || null,
            patient_birth_date: formatDate(study.PatientMainDicomTags.PatientBirthDate),
            patient_age: calculateAge(study.PatientMainDicomTags.PatientBirthDate),
            patient_gender: parseGender(study.PatientMainDicomTags.PatientSex),
        };

        // Prepare data for DETAIL ORDER
        const detailOrderData = {
            accession_number: accessionNumber,
            order_number: study.MainDicomTags.StudyID || null,
            schedule_date: study.MainDicomTags.StudyDate
                ? new Date(formatDate(study.MainDicomTags.StudyDate) || new Date())
                : new Date(),
            notes: study.MainDicomTags.StudyDescription || null,
            pacs_study_url: `${ORTHANC_CONFIG.url}:${ORTHANC_CONFIG.port}/studies/${study.ID}`,
            id_modality: modalityId,
            order_status: "FINAL" as const,
        };

        if (verbose) {
            console.log(`\n   📋 Study Data:`);
            console.log(`      Accession Number: ${accessionNumber}`);
            console.log(`      Patient Name    : ${orderData.patient_name || 'N/A'}`);
            console.log(`      Patient MRN     : ${orderData.patient_mrn || 'N/A'}`);
            console.log(`      Patient DOB     : ${orderData.patient_birth_date || 'N/A'}`);
            console.log(`      Patient Age     : ${orderData.patient_age || 'N/A'}`);
            console.log(`      Patient Gender  : ${orderData.patient_gender || 'N/A'}`);
            console.log(`      Modality        : ${modalityCode || 'N/A'}${modalityId ? ` (ID: ${modalityId.substring(0, 8)}...)` : ' (No ID)'}`);
            console.log(`      Study Date      : ${formatDate(study.MainDicomTags.StudyDate) || 'N/A'}`);
            console.log(`      Study Desc      : ${study.MainDicomTags.StudyDescription || 'N/A'}`);
        }

        if (dryRun) {
            return {
                success: true,
                message: `[DRY RUN] Would insert Order + Detail Order for ACSN: ${accessionNumber}`
            };
        }

        // Insert to database
        await db.transaction(async (tx) => {
            // Insert Order
            const [insertedOrder] = await tx.insert(orderTable).values(orderData).returning();

            // Insert Detail Order with Order ID
            await tx.insert(detailOrderTable).values({
                ...detailOrderData,
                id_order: insertedOrder.id,
            });
        });

        return {
            success: true,
            message: `Inserted Order + Detail Order for ACSN: ${accessionNumber}`
        };

    } catch (error: any) {
        // Get more detailed error message
        const errorMessage = error?.message || error?.toString() || "Unknown error";
        const errorDetail = error?.detail || "";
        const fullError = errorDetail ? `${errorMessage} (${errorDetail})` : errorMessage;

        return {
            success: false,
            message: `Error: ${fullError}`
        };
    }
}

// ==========================================
// MAIN EXECUTION
// ==========================================
async function main() {
    console.log("╔════════════════════════════════════════════════════════════════════════════╗");
    console.log("║             🏥 PACS TO DATABASE IMPORT SCRIPT                              ║");
    console.log("╚════════════════════════════════════════════════════════════════════════════╝");

    // Parse arguments
    const limitArg = process.argv.find(arg => arg.startsWith("--limit="));
    const dryRun = process.argv.includes("--dry-run");
    const verbose = process.argv.includes("--verbose");

    const limit = limitArg ? parseInt(limitArg.split("=")[1]) : undefined;

    console.log(`\n⚙️  Configuration:`);
    console.log(`   PACS URL    : ${ORTHANC_CONFIG.url}:${ORTHANC_CONFIG.port}`);
    console.log(`   Mode        : ${dryRun ? '🔍 DRY RUN (no database changes)' : '💾 LIVE IMPORT'}`);
    console.log(`   Limit       : ${limit || 'ALL studies'}`);
    console.log(`   Verbose     : ${verbose ? 'YES' : 'NO'}`);

    try {
        // Get all studies from PACS
        const studyIds = await getAllStudyIDs();

        if (studyIds.length === 0) {
            console.log("\n⚠️  No studies found in PACS");
            return;
        }

        const studiesToImport = limit ? studyIds.slice(0, limit) : studyIds;

        console.log(`\n📊 Starting import for ${studiesToImport.length} studies...`);
        console.log("─".repeat(80));

        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < studiesToImport.length; i++) {
            const studyId = studiesToImport[i];
            console.log(`\n[${i + 1}/${studiesToImport.length}] Processing study: ${studyId}`);

            try {
                const study = await getStudyDetails(studyId);
                const result = await importStudyToDatabase(study, dryRun, verbose);

                if (result.success) {
                    console.log(`   ✅ ${result.message}`);
                    successCount++;
                } else {
                    console.log(`   ❌ ${result.message}`);
                    errors.push(`Study ${studyId}: ${result.message}`);
                    failCount++;
                }
            } catch (error: any) {
                console.log(`   ❌ Failed to process: ${error.message}`);
                errors.push(`Study ${studyId}: ${error.message}`);
                failCount++;
            }
        }

        // Summary
        console.log("\n" + "=".repeat(80));
        console.log("📈 IMPORT SUMMARY");
        console.log("=".repeat(80));
        console.log(`   Total Studies in PACS  : ${studyIds.length}`);
        console.log(`   Studies Processed      : ${studiesToImport.length}`);
        console.log(`   Successful             : ✅ ${successCount}`);
        console.log(`   Failed                 : ❌ ${failCount}`);
        console.log(`   Mode                   : ${dryRun ? 'DRY RUN' : 'LIVE IMPORT'}`);

        if (errors.length > 0 && verbose) {
            console.log(`\n❌ Errors encountered:`);
            errors.forEach((err, idx) => {
                console.log(`   ${idx + 1}. ${err}`);
            });
        }

        console.log("=".repeat(80));
        console.log(`\n✅ Script completed successfully!\n`);

    } catch (error: any) {
        console.error("\n❌ Error occurred:", error.message);
        process.exit(1);
    }
}

// ==========================================
// HELP
// ==========================================
if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║             🏥 PACS TO DATABASE IMPORT SCRIPT                              ║
╚════════════════════════════════════════════════════════════════════════════╝

DESCRIPTION:
  This script imports studies from Orthanc PACS into the RIS database.
  For each study, it creates:
    1. One ORDER record (with patient information)
    2. One DETAIL_ORDER record (with accession number and study information)

USAGE:
  bun run scripts/pacs-to-database.ts [options]

OPTIONS:
  --help, -h      Show this help message
  --limit=N       Limit number of studies to import (default: all)
  --dry-run       Print what would be inserted without actually inserting
  --verbose       Show detailed information during import

EXAMPLES:
  # Test import (dry run) for first 5 studies
  bun run scripts/pacs-to-database.ts --dry-run --limit=5 --verbose

  # Import all studies from PACS
  bun run scripts/pacs-to-database.ts

  # Import first 10 studies
  bun run scripts/pacs-to-database.ts --limit=10

DATA FIELDS IMPORTED:
  FROM PACS                       TO DATABASE
  ──────────────────────────────  ──────────────────────────
  Study/Patient Info              → ORDER table:
    - PatientName                   - patient_name
    - PatientID                     - patient_mrn
    - PatientBirthDate              - patient_birth_date
    - PatientSex                    - patient_gender
    - (calculated)                  - patient_age
  
  Study/Series Info               → DETAIL_ORDER table:
    - AccessionNumber               - accession_number
    - StudyID                       - order_number
    - StudyDate                     - schedule_date
    - StudyDescription              - notes
    - (PACS URL)                    - pacs_study_url

OTHER FIELDS:
  The following fields are left NULL for now and can be filled later:
    - id_patient, id_practitioner, id_loinc, id_modality
    - id_requester, id_performer, diagnosis_code, etc.

ENVIRONMENT VARIABLES (from .env):
  ORTHANC_URL, ORTHANC_HTTP_PORT, ORTHANC_USERNAME, ORTHANC_PASSWORD
    `);
    process.exit(0);
}

// Run main function
main();
