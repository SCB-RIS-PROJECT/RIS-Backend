#!/usr/bin/env bun
/**
 * PACS Data Analysis Script
 * 
 * Script ini untuk menganalisis data apa saja yang tersedia di PACS
 * dan menampilkan semua DICOM tags yang ada.
 * 
 * Usage:
 *   bun run scripts/pacs-data-analysis.ts [--limit=N]
 */

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
        throw new Error(`HTTP Error! Status: ${response.status} - ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return await response.json();
    }

    return await response.text();
}

// ==========================================
// MAIN FUNCTION
// ==========================================
async function main() {
    console.log("╔════════════════════════════════════════════════════════════════════════════╗");
    console.log("║                  🏥 PACS DATA ANALYSIS SCRIPT                              ║");
    console.log("╚════════════════════════════════════════════════════════════════════════════╝");

    const limitArg = process.argv.find(arg => arg.startsWith("--limit="));
    const limit = limitArg ? parseInt(limitArg.split("=")[1]) : 5;

    console.log(`\n⚙️  Configuration:`);
    console.log(`   PACS URL    : ${ORTHANC_CONFIG.url}:${ORTHANC_CONFIG.port}`);
    console.log(`   Analysis of : ${limit} studies`);

    try {
        // Get all studies
        console.log(`\n📋 Fetching study IDs from PACS...`);
        const studyIds = await fetchOrthancAPI(
            ORTHANC_CONFIG.url,
            ORTHANC_CONFIG.port,
            "/studies",
            ORTHANC_CONFIG.username,
            ORTHANC_CONFIG.password
        );

        console.log(`✅ Found ${studyIds.length} studies in PACS`);

        const studiesToAnalyze = studyIds.slice(0, limit);
        const allFieldsFound = new Set<string>();
        const fieldExamples = new Map<string, any>();

        for (let i = 0; i < studiesToAnalyze.length; i++) {
            const studyId = studiesToAnalyze[i];
            console.log(`\n[${i + 1}/${studiesToAnalyze.length}] Analyzing study: ${studyId}`);

            // Get study details
            const study = await fetchOrthancAPI(
                ORTHANC_CONFIG.url,
                ORTHANC_CONFIG.port,
                `/studies/${studyId}`,
                ORTHANC_CONFIG.username,
                ORTHANC_CONFIG.password
            );

            // Collect study-level tags
            console.log(`   Study Tags: ${Object.keys(study.MainDicomTags).length} tags`);
            for (const [key, value] of Object.entries(study.MainDicomTags)) {
                allFieldsFound.add(`Study.MainDicomTags.${key}`);
                if (!fieldExamples.has(`Study.MainDicomTags.${key}`) && value) {
                    fieldExamples.set(`Study.MainDicomTags.${key}`, value);
                }
            }

            // Collect patient-level tags
            console.log(`   Patient Tags: ${Object.keys(study.PatientMainDicomTags).length} tags`);
            for (const [key, value] of Object.entries(study.PatientMainDicomTags)) {
                allFieldsFound.add(`Study.PatientMainDicomTags.${key}`);
                if (!fieldExamples.has(`Study.PatientMainDicomTags.${key}`) && value) {
                    fieldExamples.set(`Study.PatientMainDicomTags.${key}`, value);
                }
            }

            // Get series information
            if (study.Series && study.Series.length > 0) {
                const firstSeriesId = study.Series[0];
                const series = await fetchOrthancAPI(
                    ORTHANC_CONFIG.url,
                    ORTHANC_CONFIG.port,
                    `/series/${firstSeriesId}`,
                    ORTHANC_CONFIG.username,
                    ORTHANC_CONFIG.password
                );

                console.log(`   Series Tags: ${Object.keys(series.MainDicomTags).length} tags`);
                for (const [key, value] of Object.entries(series.MainDicomTags)) {
                    allFieldsFound.add(`Series.MainDicomTags.${key}`);
                    if (!fieldExamples.has(`Series.MainDicomTags.${key}`) && value) {
                        fieldExamples.set(`Series.MainDicomTags.${key}`, value);
                    }
                }
            }

            // Get full DICOM tags from first instance
            const instances = await fetchOrthancAPI(
                ORTHANC_CONFIG.url,
                ORTHANC_CONFIG.port,
                `/studies/${studyId}/instances`,
                ORTHANC_CONFIG.username,
                ORTHANC_CONFIG.password
            );

            if (instances.length > 0) {
                const fullTags = await fetchOrthancAPI(
                    ORTHANC_CONFIG.url,
                    ORTHANC_CONFIG.port,
                    `/instances/${instances[0].ID}/simplified-tags`,
                    ORTHANC_CONFIG.username,
                    ORTHANC_CONFIG.password
                );

                console.log(`   Full DICOM Tags: ${Object.keys(fullTags).length} tags`);
                for (const [key, value] of Object.entries(fullTags)) {
                    allFieldsFound.add(`Instance.${key}`);
                    if (!fieldExamples.has(`Instance.${key}`) && value) {
                        fieldExamples.set(`Instance.${key}`, value);
                    }
                }
            }
        }

        // Display summary
        console.log("\n" + "=".repeat(80));
        console.log("📊 ANALYSIS RESULTS");
        console.log("=".repeat(80));

        console.log(`\n✅ Total Unique DICOM Tags Found: ${allFieldsFound.size}`);

        console.log("\n📋 STUDY-LEVEL TAGS:");
        const studyTags = Array.from(allFieldsFound).filter(f => f.startsWith("Study.MainDicomTags.")).sort();
        studyTags.forEach(tag => {
            const example = fieldExamples.get(tag);
            console.log(`   ${tag.replace('Study.MainDicomTags.', '')}: ${example || 'N/A'}`);
        });

        console.log("\n👤 PATIENT-LEVEL TAGS:");
        const patientTags = Array.from(allFieldsFound).filter(f => f.startsWith("Study.PatientMainDicomTags.")).sort();
        patientTags.forEach(tag => {
            const example = fieldExamples.get(tag);
            console.log(`   ${tag.replace('Study.PatientMainDicomTags.', '')}: ${example || 'N/A'}`);
        });

        console.log("\n📸 SERIES-LEVEL TAGS:");
        const seriesTags = Array.from(allFieldsFound).filter(f => f.startsWith("Series.MainDicomTags.")).sort();
        seriesTags.forEach(tag => {
            const example = fieldExamples.get(tag);
            console.log(`   ${tag.replace('Series.MainDicomTags.', '')}: ${example || 'N/A'}`);
        });

        console.log("\n🔬 IMPORTANT INSTANCE-LEVEL TAGS:");
        const importantInstanceTags = [
            "RequestedProcedureCodeSequence",
            "ProcedureCodeSequence",
            "OperatorsName",
            "NameOfPhysiciansReadingStudy",
            "RequestedProcedureDescription",
            "PerformedProcedureStepDescription",
            "ScheduledProcedureStepDescription",
            "StudyComments",
            "AdditionalPatientHistory",
            "AnatomicRegionSequence",
            "RequestAttributesSequence"
        ];

        importantInstanceTags.forEach(tag => {
            const fullTag = `Instance.${tag}`;
            if (allFieldsFound.has(fullTag)) {
                const example = fieldExamples.get(fullTag);
                const exampleStr = typeof example === 'object' ? JSON.stringify(example) : example;
                console.log(`   ${tag}: ${exampleStr || 'N/A'}`);
            }
        });

        // Export to JSON file
        const analysisResult = {
            timestamp: new Date().toISOString(),
            totalStudiesAnalyzed: studiesToAnalyze.length,
            totalUniqueTags: allFieldsFound.size,
            tags: {
                study: studyTags.map(t => ({ field: t, example: fieldExamples.get(t) })),
                patient: patientTags.map(t => ({ field: t, example: fieldExamples.get(t) })),
                series: seriesTags.map(t => ({ field: t, example: fieldExamples.get(t) })),
                instance: Array.from(allFieldsFound)
                    .filter(f => f.startsWith("Instance."))
                    .map(t => ({ field: t, example: fieldExamples.get(t) }))
                    .sort((a, b) => a.field.localeCompare(b.field))
            }
        };

        await Bun.write("pacs-data-analysis.json", JSON.stringify(analysisResult, null, 2));
        console.log("\n💾 Full analysis exported to: pacs-data-analysis.json");

        console.log("\n" + "=".repeat(80));
        console.log("✅ Analysis completed successfully!\n");

    } catch (error: any) {
        console.error("\n❌ Error occurred:", error.message);
        process.exit(1);
    }
}

main();
