/**
 * Test Script: Generate 20 Sample Orders for Testing
 * 
 * Usage:
 *   bun run scripts/generate-test-orders.ts
 *   bun run scripts/generate-test-orders.ts 30  (generate 30 orders)
 *   API_TOKEN=your_token bun run scripts/generate-test-orders.ts 20 send
 * 
 * This script will:
 * 1. Fetch LOINC, Modality, and Practitioner data from API
 * 2. Generate sample order data with id_loinc (UUID)
 * 3. Send to API endpoint and create orders
 * 4. Update each detail with modality and performer
 * 5. Save to JSON file
 */

const SAMPLE_PATIENTS = [
    { name: "Muhammad Ghufran", mrn: "12345", birthDate: "1990-07-10", age: 35, gender: "MALE" },
    { name: "Siti Nurhaliza", mrn: "67890", birthDate: "1985-05-15", age: 40, gender: "FEMALE" },
    { name: "Budi Santoso", mrn: "11111", birthDate: "1975-03-20", age: 50, gender: "MALE" },
    { name: "Dewi Kartika", mrn: "22222", birthDate: "1995-11-08", age: 30, gender: "FEMALE" },
    { name: "Ahmad Yani", mrn: "33333", birthDate: "1960-01-15", age: 65, gender: "MALE" },
    { name: "Ratna Sari", mrn: "44444", birthDate: "1988-09-22", age: 37, gender: "FEMALE" },
    { name: "Eko Prasetyo", mrn: "55555", birthDate: "1992-06-30", age: 33, gender: "MALE" },
    { name: "Lestari Wulandari", mrn: "66666", birthDate: "1978-12-12", age: 47, gender: "FEMALE" },
    { name: "Hadi Wijaya", mrn: "77777", birthDate: "1983-04-05", age: 42, gender: "MALE" },
    { name: "Sri Mulyani", mrn: "88888", birthDate: "1997-08-18", age: 28, gender: "FEMALE" },
];

const SAMPLE_PRACTITIONERS_IHS = [
    { ihs: "N10000001", name: "Dr. Bronsig, Sp.Rad" },
    { ihs: "N10000002", name: "Dr. Ahmad Syafiq, Sp.PD" },
    { ihs: "N10000003", name: "Dr. Sarah Wijaya, Sp.OG" },
    { ihs: "N10000004", name: "Dr. Budi Hartono, Sp.OT" },
    { ihs: "N10000005", name: "Dr. Linda Kusuma, Sp.JP" },
];

const SAMPLE_DIAGNOSES = [
    { code: "J18.9", display: "Pneumonia, unspecified organism" },
    { code: "M79.3", display: "Panniculitis, unspecified" },
    { code: "K29.7", display: "Gastritis, unspecified" },
    { code: "I10", display: "Essential (primary) hypertension" },
    { code: "E11.9", display: "Type 2 diabetes mellitus without complications" },
    { code: "M54.5", display: "Low back pain" },
    { code: "N39.0", display: "Urinary tract infection, site not specified" },
    { code: "J06.9", display: "Acute upper respiratory infection, unspecified" },
    { code: "A09", display: "Infectious gastroenteritis and colitis, unspecified" },
    { code: "R50.9", display: "Fever, unspecified" },
];

const PRIORITIES = ["ROUTINE", "URGENT", "ASAP", "STAT"];

const NOTES = [
    "Pasien tidak puasa",
    "Pasien sudah puasa 8 jam",
    "Urgent case, suspect acute condition",
    "Follow up pemeriksaan sebelumnya",
    "Kontrol rutin",
    "Pasien alergi kontras media",
    "Pemeriksaan pre-operatif",
    "Second opinion needed",
    "Evaluasi post-treatment",
    "Pasien dengan pacemaker",
];

// API Data Cache
let loincData: any[] = [];
let modalityData: any[] = [];
let practitionerData: any[] = [];

function randomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

function randomItems<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, array.length));
}

function generateOrderId(): string {
    const timestamp = Date.now();
    return `PEL-${timestamp}`;
}

function generateEncounterId(): string {
    return crypto.randomUUID();
}

async function fetchFromAPI(url: string, token: string) {
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`❌ Failed to fetch from ${url}:`, error);
        return null;
    }
}

async function fetchMasterData(baseUrl: string, token: string) {
    console.log("📡 Fetching master data from API...\n");

    // Fetch LOINC
    console.log("  ├─ Fetching LOINC data...");
    const loincResponse = await fetchFromAPI(`${baseUrl}/api/loinc?per_page=100`, token);
    if (loincResponse?.content?.entries) {
        loincData = loincResponse.content.entries;
        console.log(`  │  ✓ Loaded ${loincData.length} LOINC items`);
    } else {
        console.log(`  │  ✗ Failed to load LOINC data`);
    }

    // Fetch Modality
    console.log("  ├─ Fetching Modality data...");
    const modalityResponse = await fetchFromAPI(`${baseUrl}/api/modalities?per_page=100`, token);
    if (modalityResponse?.content?.entries) {
        modalityData = modalityResponse.content.entries;
        console.log(`  │  ✓ Loaded ${modalityData.length} Modality items`);
    } else {
        console.log(`  │  ✗ Failed to load Modality data`);
    }

    // Fetch Practitioner
    console.log("  └─ Fetching Practitioner data...");
    const practitionerResponse = await fetchFromAPI(`${baseUrl}/api/practitioners?per_page=100`, token);
    if (practitionerResponse?.content?.entries) {
        // Filter hanya practitioner yang memiliki ihs_number
        practitionerData = practitionerResponse.content.entries.filter((p: any) => p.ihs_number && p.ihs_number !== null);
        console.log(`     ✓ Loaded ${practitionerData.length} Practitioner items (with IHS number)`);
    } else {
        console.log(`     ✗ Failed to load Practitioner data`);
    }

    console.log();

    return {
        loinc: loincData,
        modality: modalityData,
        practitioner: practitionerData,
    };
}

function generateOrder(index: number) {
    const patient = randomItem(SAMPLE_PATIENTS);
    const practitionerIhs = randomItem(SAMPLE_PRACTITIONERS_IHS);
    const diagnosis = randomItem(SAMPLE_DIAGNOSES);
    const priority = randomItem(PRIORITIES);
    const note = randomItem(NOTES);

    // Random 1-3 LOINC items
    const loincCount = Math.floor(Math.random() * 3) + 1;
    const selectedLoinc = randomItems(loincData, loincCount);

    return {
        id_pelayanan: generateOrderId(),
        subject: {
            ihs_id: `10000003000${index}`,
            patient_name: patient.name,
            patient_mrn: patient.mrn,
            patient_birth_date: patient.birthDate,
            patient_age: patient.age,
            patient_gender: patient.gender,
        },
        encounter: {
            encounter_id: generateEncounterId(),
        },
        requester: {
            id_practitioner: practitionerIhs.ihs,
            name_practitioner: practitionerIhs.name,
        },
        diagnosa: {
            system: "http://hl7.org/fhir/sid/icd-10",
            code: diagnosis.code,
            display: diagnosis.display,
        },
        order_priority: priority,
        notes: note,
        details: selectedLoinc.map(loinc => ({
            id_loinc: loinc.id,
        })),
    };
}

async function sendToAPI(order: any, apiUrl: string, token: string) {
    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(order),
        });

        const data = await response.json();

        return {
            success: response.ok,
            status: response.status,
            data: data,
        };
    } catch (error) {
        return {
            success: false,
            status: 0,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

async function updateDetailModalityPerformer(
    baseUrl: string,
    token: string,
    orderId: string,
    detailId: string,
    updateData: { ae_title: string; id_performer: string; id_modality: string }
) {
    try {
        const response = await fetch(
            `${baseUrl}/api/orders/${orderId}/details/${detailId}/update-modality-performer`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(updateData),
            }
        );

        const data = await response.json();

        return {
            success: response.ok,
            status: response.status,
            data: data,
        };
    } catch (error) {
        return {
            success: false,
            status: 0,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

async function main() {
    console.log("=".repeat(70));
    console.log("🏥 Generate Sample Orders for Testing");
    console.log("=".repeat(70));
    console.log();

    // Get arguments
    const args = process.argv.slice(2);
    const count = parseInt(args[0]) || 20;
    const sendToApiFlag = args[1] === "send";
    const baseUrl = process.env.API_URL || "http://localhost:8001";
    const token = process.env.API_TOKEN || "";

    console.log("📋 Configuration:");
    console.log("  Number of orders:", count);
    console.log("  Send to API:", sendToApiFlag ? "Yes" : "No");
    if (sendToApiFlag) {
        console.log("  API URL:", baseUrl);
        console.log("  Token:", token ? "✓ Set" : "✗ Not set");
    }
    console.log();

    // Fetch master data if sending to API
    if (sendToApiFlag && token) {
        const masterData = await fetchMasterData(baseUrl, token);

        if (!masterData.loinc.length || !masterData.modality.length || !masterData.practitioner.length) {
            console.error("❌ Failed to fetch master data. Aborting.");
            process.exit(1);
        }
    } else {
        console.log("⚠️  Skipping master data fetch (not sending to API)");
        console.log();
    }

    // Generate orders
    console.log(`📝 Generating ${count} orders...\n`);
    const orders = [];
    const results = [];

    for (let i = 1; i <= count; i++) {
        const order = generateOrder(i);
        orders.push(order);

        console.log(`[${i}/${count}] Generated order for: ${order.subject.patient_name}`);
        console.log(`  ├─ ID Pelayanan: ${order.id_pelayanan}`);
        console.log(`  ├─ Priority: ${order.order_priority}`);
        console.log(`  └─ Details: ${order.details.length}`);

        // Send to API if flag is set
        if (sendToApiFlag && token) {
            console.log(`  📡 Creating order...`);
            const createResult = await sendToAPI(order, `${baseUrl}/api/orders`, token);

            if (createResult.success && createResult.data?.content?.data) {
                const orderData = createResult.data.content.data;
                const orderId = orderData.id_order;
                const details = orderData.details || [];

                console.log(`  ✅ Order created (${createResult.status})`);
                console.log(`  │  └─ Order ID: ${orderId}`);

                // Update each detail with modality and performer
                console.log(`  📝 Updating ${details.length} details...`);

                for (let j = 0; j < details.length; j++) {
                    const detail = details[j];
                    const detailId = detail.id;

                    // Get random modality and performer
                    const modality = randomItem(modalityData);
                    const performer = randomItem(practitionerData);
                    const aeTitle = randomItem(modality.aet || ["AET_DEFAULT"]);

                    console.log(`  │  [${j + 1}/${details.length}] Updating detail ${detailId.substring(0, 8)}...`);

                    const updateResult = await updateDetailModalityPerformer(
                        baseUrl,
                        token,
                        orderId,
                        detailId,
                        {
                            ae_title: aeTitle,
                            id_performer: performer.id,
                            id_modality: modality.id,
                        }
                    );

                    if (updateResult.success) {
                        console.log(`  │  │  ✓ Updated with ${modality.name} - ${performer.name}`);
                    } else {
                        console.log(`  │  │  ✗ Failed: ${updateResult.error || JSON.stringify(updateResult.data)}`);
                    }

                    // Small delay between updates
                    await new Promise(resolve => setTimeout(resolve, 200));
                }

                results.push({
                    order,
                    orderId,
                    success: true,
                    detailsUpdated: details.length,
                });

                console.log(`  └─ ✅ Completed`);
            } else {
                console.log(`  ❌ Failed (${createResult.status}): ${createResult.error || JSON.stringify(createResult.data)}`);
                results.push({
                    order,
                    success: false,
                    error: createResult.error || createResult.data,
                });
            }
            console.log();

            // Delay between orders
            await new Promise(resolve => setTimeout(resolve, 500));
        } else {
            console.log();
        }
    }

    // Save to file
    const filename = `test-orders-${Date.now()}.json`;
    const filepath = `./temp/${filename}`;

    console.log("=".repeat(70));
    console.log("💾 Saving to file...");

    const outputData = {
        orders,
        results: sendToApiFlag ? results : undefined,
        summary: {
            total_orders: orders.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
        },
    };

    await Bun.write(filepath, JSON.stringify(outputData, null, 2));

    console.log(`✅ Saved to: ${filepath}`);
    console.log();

    // Summary
    console.log("=".repeat(70));
    console.log("📊 Summary:");
    console.log(`  Total orders generated: ${orders.length}`);
    console.log(`  Total patients: ${new Set(orders.map(o => o.subject.patient_mrn)).size}`);
    console.log(`  Total details: ${orders.reduce((sum, o) => sum + o.details.length, 0)}`);

    if (sendToApiFlag) {
        console.log(`  Successful: ${results.filter(r => r.success).length}`);
        console.log(`  Failed: ${results.filter(r => !r.success).length}`);
    }

    console.log("=".repeat(70));
    console.log();

    if (!sendToApiFlag) {
        console.log("💡 To send these orders to API:");
        console.log(`   API_TOKEN=your_token bun run scripts/generate-test-orders.ts ${count} send`);
        console.log();
    }

    process.exit(0);
}

main().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
});
