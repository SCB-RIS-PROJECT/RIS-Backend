/**
 * Test Script: Generate 20 Sample Orders for Testing
 * 
 * Usage:
 *   bun run scripts/generate-test-orders.ts
 *   bun run scripts/generate-test-orders.ts 30  (generate 30 orders)
 * 
 * This script will:
 * 1. Generate sample order data
 * 2. Save to JSON file
 * 3. Optionally send to API endpoint
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

const SAMPLE_PRACTITIONERS = [
    { id: "N10000001", name: "Dr. Bronsig, Sp.Rad" },
    { id: "N10000002", name: "Dr. Ahmad Syafiq, Sp.PD" },
    { id: "N10000003", name: "Dr. Sarah Wijaya, Sp.OG" },
    { id: "N10000004", name: "Dr. Budi Hartono, Sp.OT" },
    { id: "N10000005", name: "Dr. Linda Kusuma, Sp.JP" },
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

const SAMPLE_PROCEDURES = [
    { code: "36687-2", display: "XR Chest AP and Lateral", text: "Pemeriksaan X-Ray Thorax PA" },
    { code: "24627-2", display: "CT Chest with contrast", text: "Pemeriksaan CT Scan Thorax dengan kontras" },
    { code: "30704-1", display: "CT Abdomen and Pelvis", text: "CT Scan Abdomen Pelvis dengan kontras" },
    { code: "36554-4", display: "US Abdomen", text: "USG Abdomen" },
    { code: "24558-9", display: "XR Abdomen", text: "X-Ray Abdomen" },
    { code: "24627-2", display: "XR Spine Lumbar", text: "X-Ray Lumbal Spine AP/Lateral" },
    { code: "26175-3", display: "CT Head without contrast", text: "CT Scan Kepala tanpa kontras" },
    { code: "30799-1", display: "MRI Brain", text: "MRI Brain dengan kontras" },
    { code: "36572-6", display: "US Pelvis", text: "USG Pelvis" },
    { code: "24558-9", display: "XR Hand", text: "X-Ray Hand AP/Lateral" },
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

function generateOrder(index: number) {
    const patient = randomItem(SAMPLE_PATIENTS);
    const practitioner = randomItem(SAMPLE_PRACTITIONERS);
    const diagnosis = randomItem(SAMPLE_DIAGNOSES);
    const priority = randomItem(PRIORITIES);
    const note = randomItem(NOTES);

    // Random 1-3 procedures
    const procedureCount = Math.floor(Math.random() * 3) + 1;
    const procedures = randomItems(SAMPLE_PROCEDURES, procedureCount);

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
            id_practitioner: practitioner.id,
            name_practitioner: practitioner.name,
        },
        diagnosa: {
            system: "http://hl7.org/fhir/sid/icd-10",
            code: diagnosis.code,
            display: diagnosis.display,
        },
        order_priority: priority,
        notes: note,
        details: procedures.map(proc => ({
            system: "http://loinc.org",
            code: proc.code,
            display: proc.display,
            text: proc.text,
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

async function main() {
    console.log("=".repeat(70));
    console.log("🏥 Generate Sample Orders for Testing");
    console.log("=".repeat(70));
    console.log();

    // Get arguments
    const args = process.argv.slice(2);
    const count = parseInt(args[0]) || 20;
    const sendToApiFlag = args[1] === "send";
    const apiUrl = process.env.API_URL || "http://localhost:3000/api/orders";
    const token = process.env.API_TOKEN || "";

    console.log("📋 Configuration:");
    console.log("  Number of orders:", count);
    console.log("  Send to API:", sendToApiFlag ? "Yes" : "No");
    if (sendToApiFlag) {
        console.log("  API URL:", apiUrl);
        console.log("  Token:", token ? "✓ Set" : "✗ Not set");
    }
    console.log();

    // Generate orders
    console.log(`📝 Generating ${count} orders...\n`);
    const orders = [];

    for (let i = 1; i <= count; i++) {
        const order = generateOrder(i);
        orders.push(order);

        console.log(`[${i}/${count}] Generated order for: ${order.subject.patient_name}`);
        console.log(`  ├─ ID Pelayanan: ${order.id_pelayanan}`);
        console.log(`  ├─ Priority: ${order.order_priority}`);
        console.log(`  └─ Procedures: ${order.details.length}`);
        console.log();

        // Send to API if flag is set
        if (sendToApiFlag && token) {
            console.log(`  📡 Sending to API...`);
            const result = await sendToAPI(order, apiUrl, token);

            if (result.success) {
                console.log(`  ✅ Success (${result.status})`);
                if (result.data?.content?.data?.id_order) {
                    console.log(`  └─ Order ID: ${result.data.content.data.id_order}`);
                }
            } else {
                console.log(`  ❌ Failed (${result.status}): ${result.error || JSON.stringify(result.data)}`);
            }
            console.log();

            // Delay to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    // Save to file
    const filename = `test-orders-${Date.now()}.json`;
    const filepath = `./temp/${filename}`;

    console.log("=".repeat(70));
    console.log("💾 Saving to file...");

    await Bun.write(filepath, JSON.stringify(orders, null, 2));

    console.log(`✅ Saved to: ${filepath}`);
    console.log();

    // Summary
    console.log("=".repeat(70));
    console.log("📊 Summary:");
    console.log(`  Total orders generated: ${orders.length}`);
    console.log(`  Total patients: ${new Set(orders.map(o => o.subject.patient_mrn)).size}`);
    console.log(`  Total procedures: ${orders.reduce((sum, o) => sum + o.details.length, 0)}`);
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
