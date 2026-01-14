#!/usr/bin/env bun
/**
 * PACS to CSV Export Script
 * 
 * Script ini untuk export semua data dari Orthanc PACS ke file CSV
 * Output: 2 file CSV (orders.csv dan detail_orders.csv)
 * 
 * Usage:
 *   bun run scripts/pacs-export-csv.ts [--limit=N]
 */

import { writeFile } from "fs/promises";

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
    PatientMainDicomTags: {
        PatientBirthDate?: string;
        PatientID?: string;
        PatientName?: string;
        PatientSex?: string;
    };
    Series: string[];
}

interface OrthancSeries {
    MainDicomTags: {
        Modality?: string;
        SeriesDescription?: string;
        BodyPartExamined?: string;
        ProtocolName?: string;
        PerformedProcedureStepDescription?: string;
    };
}

interface OrderCSVRow {
    patient_name: string;
    patient_mrn: string;
    patient_birth_date: string;
    patient_age: string;
    patient_gender: string;
}

interface DetailOrderCSVRow {
    accession_number: string;
    order_number: string;
    schedule_date: string;
    schedule_time: string;
    modality: string;
    body_part: string;
    study_description: string;
    institution_name: string;
    referring_physician: string;
    performing_physician: string;
    protocol_name: string;
    pacs_study_url: string;
    pacs_study_id: string;
    study_instance_uid: string;
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
    password: string
): Promise<any> {
    const url = `${baseUrl}:${port}${endpoint}`;
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        Authorization: createAuthHeader(username, password),
    };

    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return await response.json();
    }

    return await response.text();
}

function formatDate(dateStr?: string): string {
    if (!dateStr) return "";
    if (dateStr.length === 8) {
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
}

function formatTime(timeStr?: string): string {
    if (!timeStr) return "";
    if (timeStr.length >= 6) {
        return `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}:${timeStr.substring(4, 6)}`;
    }
    return timeStr;
}

function formatDicomName(name?: string): string {
    if (!name) return "";
    return name.replace(/\^/g, " ").trim();
}

function parseGender(sex?: string): string {
    if (!sex) return "";
    const sexUpper = sex.toUpperCase();
    if (sexUpper === "M" || sexUpper === "MALE") return "L";
    if (sexUpper === "F" || sexUpper === "FEMALE") return "P";
    return sex;
}

function calculateAge(birthDate?: string): string {
    if (!birthDate) return "";
    const formatted = formatDate(birthDate);
    if (!formatted) return "";

    const birth = new Date(formatted);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age.toString();
}

function escapeCSV(value: any): string {
    if (value === null || value === undefined) return "";
    const str = String(value);
    // Escape double quotes and wrap in quotes if contains comma, newline, or quote
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function arrayToCSV(headers: string[], rows: any[][]): string {
    const csvHeaders = headers.join(",");
    const csvRows = rows.map(row => row.map(escapeCSV).join(","));
    return [csvHeaders, ...csvRows].join("\n");
}

// ==========================================
// MAIN FUNCTIONS
// ==========================================
async function getAllStudies(): Promise<string[]> {
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

async function exportToCSV() {
    const limitArg = process.argv.find(arg => arg.startsWith("--limit="));
    const limit = limitArg ? parseInt(limitArg.split("=")[1]) : undefined;

    console.log("╔════════════════════════════════════════════════════════════════════════════╗");
    console.log("║              🏥 PACS TO CSV EXPORT SCRIPT                                  ║");
    console.log("╚════════════════════════════════════════════════════════════════════════════╝");

    console.log(`\n⚙️  Configuration:`);
    console.log(`   PACS URL    : ${ORTHANC_CONFIG.url}:${ORTHANC_CONFIG.port}`);
    console.log(`   Export Limit: ${limit || 'ALL studies'}`);

    try {
        const studyIds = await getAllStudies();
        const studiesToExport = limit ? studyIds.slice(0, limit) : studyIds;

        console.log(`\n📊 Exporting ${studiesToExport.length} studies to CSV...`);
        console.log("─".repeat(80));

        const orderRows: any[][] = [];
        const detailOrderRows: any[][] = [];
        let successCount = 0;
        let skipCount = 0;

        for (let i = 0; i < studiesToExport.length; i++) {
            const studyId = studiesToExport[i];
            console.log(`\r[${i + 1}/${studiesToExport.length}] Processing...`,);

            try {
                const study = await getStudyDetails(studyId);
                const accessionNumber = study.MainDicomTags.AccessionNumber;

                if (!accessionNumber) {
                    skipCount++;
                    continue;
                }

                // Get modality from first series
                let modality = "";
                let bodyPart = "";
                let protocolName = "";
                let performedProcedure = "";

                if (study.Series && study.Series.length > 0) {
                    try {
                        const series = await getSeriesDetails(study.Series[0]);
                        modality = series.MainDicomTags.Modality || "";
                        bodyPart = series.MainDicomTags.BodyPartExamined || "";
                        protocolName = series.MainDicomTags.ProtocolName || "";
                        performedProcedure = series.MainDicomTags.PerformedProcedureStepDescription || "";
                    } catch (error) {
                        // Ignore series error
                    }
                }

                // Order data
                orderRows.push([
                    formatDicomName(study.PatientMainDicomTags.PatientName),
                    study.PatientMainDicomTags.PatientID || "",
                    formatDate(study.PatientMainDicomTags.PatientBirthDate),
                    calculateAge(study.PatientMainDicomTags.PatientBirthDate),
                    parseGender(study.PatientMainDicomTags.PatientSex),
                ]);

                // Detail Order data
                detailOrderRows.push([
                    accessionNumber,
                    study.MainDicomTags.StudyID || "",
                    formatDate(study.MainDicomTags.StudyDate),
                    formatTime(study.MainDicomTags.StudyTime),
                    modality,
                    bodyPart,
                    study.MainDicomTags.StudyDescription || "",
                    study.MainDicomTags.InstitutionName || "",
                    study.MainDicomTags.ReferringPhysicianName || "",
                    study.MainDicomTags.PerformingPhysicianName || "",
                    protocolName,
                    `${ORTHANC_CONFIG.url}:${ORTHANC_CONFIG.port}/studies/${studyId}`,
                    studyId,
                    study.MainDicomTags.StudyInstanceUID || "",
                ]);

                successCount++;
            } catch (error: any) {
                console.error(`\n   ❌ Error processing study ${studyId}: ${error.message}`);
                skipCount++;
            }
        }

        console.log("\n");

        // Write Orders CSV
        const orderHeaders = [
            "patient_name",
            "patient_mrn",
            "patient_birth_date",
            "patient_age",
            "patient_gender",
        ];

        const ordersCSV = arrayToCSV(orderHeaders, orderRows);
        const ordersFilename = `pacs_orders_${new Date().toISOString().split('T')[0]}.csv`;
        await writeFile(ordersFilename, ordersCSV);
        console.log(`✅ Orders exported to: ${ordersFilename}`);
        console.log(`   Records: ${orderRows.length}`);

        // Write Detail Orders CSV
        const detailOrderHeaders = [
            "accession_number",
            "order_number",
            "schedule_date",
            "schedule_time",
            "modality",
            "body_part",
            "study_description",
            "institution_name",
            "referring_physician",
            "performing_physician",
            "protocol_name",
            "pacs_study_url",
            "pacs_study_id",
            "study_instance_uid",
        ];

        const detailOrdersCSV = arrayToCSV(detailOrderHeaders, detailOrderRows);
        const detailOrdersFilename = `pacs_detail_orders_${new Date().toISOString().split('T')[0]}.csv`;
        await writeFile(detailOrdersFilename, detailOrdersCSV);
        console.log(`✅ Detail Orders exported to: ${detailOrdersFilename}`);
        console.log(`   Records: ${detailOrderRows.length}`);

        // Summary
        console.log("\n" + "=".repeat(80));
        console.log("📈 EXPORT SUMMARY");
        console.log("=".repeat(80));
        console.log(`   Total Studies in PACS  : ${studyIds.length}`);
        console.log(`   Studies Processed      : ${studiesToExport.length}`);
        console.log(`   Successfully Exported  : ✅ ${successCount}`);
        console.log(`   Skipped (No ACSN)      : ⚠️  ${skipCount}`);
        console.log(`   Files Created          : 2 CSV files`);
        console.log("=".repeat(80));

        console.log(`\n✅ Export completed successfully!\n`);

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
║              🏥 PACS TO CSV EXPORT SCRIPT                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

DESCRIPTION:
  Export all studies from Orthanc PACS to CSV files.
  Creates 2 CSV files:
    1. pacs_orders_YYYY-MM-DD.csv           - Patient information
    2. pacs_detail_orders_YYYY-MM-DD.csv    - Study details

USAGE:
  bun run scripts/pacs-export-csv.ts [options]

OPTIONS:
  --help, -h      Show this help message
  --limit=N       Limit number of studies to export (default: all)

EXAMPLES:
  # Export first 10 studies
  bun run scripts/pacs-export-csv.ts --limit=10

  # Export all studies
  bun run scripts/pacs-export-csv.ts

OUTPUT CSV COLUMNS:

Orders CSV:
  - patient_name          Patient name
  - patient_mrn           Patient MRN/ID
  - patient_birth_date    Birth date (YYYY-MM-DD)
  - patient_age           Calculated age
  - patient_gender        Gender (L/P)

Detail Orders CSV:
  - accession_number      Accession Number (UNIQUE)
  - order_number          Study ID
  - schedule_date         Study date
  - schedule_time         Study time
  - modality              Modality (CT, MR, DX, etc)
  - body_part             Body part examined
  - study_description     Study description
  - institution_name      Institution name
  - referring_physician   Referring physician
  - performing_physician  Performing physician
  - protocol_name         Protocol name
  - pacs_study_url        URL to study in PACS
  - pacs_study_id         Orthanc Study ID
  - study_instance_uid    DICOM Study Instance UID

NOTES:
  - Studies without Accession Number will be skipped
  - CSV files are created in the current directory
  - Files are named with current date
    `);
    process.exit(0);
}

// Run export
exportToCSV();
