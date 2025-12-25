/**
 * Test Script: Satu Sehat Full Flow
 * 
 * Flow:
 * 1. Get OAuth2 Token
 * 2. Search/Create Patient by NIK
 * 3. Create Encounter
 * 4. Test Create Order with full ServiceRequest
 * 
 * Usage: bun run scripts/test-satusehat-full-flow.ts
 */

import env from "@/config/env";

// ========== Configuration ==========
// Note: AUTH_URL from env already includes the full path with query string
const AUTH_URL = env.SATU_SEHAT_AUTH_URL; 
const BASE_URL = env.SATU_SEHAT_BASE_URL;
const CLIENT_ID = env.SATU_SEHAT_CLIENT_ID;
const CLIENT_SECRET = env.SATU_SEHAT_CLIENT_SECRET;
const ORGANIZATION_ID = env.SATU_SEHAT_ORGANIZATION_ID;

// Test Data
const TEST_PATIENT = {
    nik: "3212121007331111",
    name: "DUNSTAN GAGG",
    gender: "male" as "male" | "female",
    birthDate: "1933-07-10",
    address: {
        line: ["Gd. Prof. Dr. Sujudi Lt.5, Jl. H.R. Rasuna Said Blok X5 Kav. 4-9 Kuningan"],
        city: "Jakarta",
        postalCode: "12950",
        province: "32",
        cityCode: "3212",
        district: "321212",
        village: "3212122013",
        rw: "4",
        rt: "50",
    },
    phone: "0690383372",
    maritalStatus: "U", // Unmarried
    contact: {
        name: "HESTIA BAYBUTT",
        phone: "0690383372",
    },
};

const TEST_PRACTITIONER = {
    id: "10009880728",
    name: "dr. Siti Aminah, Sp.PD",
};

const TEST_LOCATION = {
    // IMPORTANT: You MUST provide a valid Location ID from Satu Sehat
    // To get your location ID, run: bun run scripts/get-satusehat-location.ts
    // Or query: GET {{base_url}}/Location?organization={{org_id}}
    id: env.SATU_SEHAT_LOCATION_ID || process.env.TEST_LOCATION_ID || "b4362ccb-148b-4f74-b334-269bbff74f02",
    name: env.SATU_SEHAT_LOCATION_NAME || process.env.TEST_LOCATION_NAME || "Poli Radiologi",
};

// ========== Step 1: Get OAuth2 Token ==========
async function getAccessToken(): Promise<string> {
    console.log("\n=== Step 1: Getting OAuth2 Token ===");
    console.log(`   - Auth URL: ${AUTH_URL}`);
    console.log(`   - Client ID: ${CLIENT_ID.substring(0, 20)}...`);
    
    // Satu Sehat uses client_id and client_secret in the body, not Basic Auth
    const response = await fetch(AUTH_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get token: ${response.status} - ${error}`);
    }

    const data = await response.json();
    console.log("✅ Token obtained successfully");
    console.log(`   - Access Token: ${data.access_token.substring(0, 20)}...`);
    console.log(`   - Expires in: ${data.expires_in} seconds (${Math.floor(data.expires_in / 60)} minutes)`);
    
    return data.access_token;
}

// ========== Step 2: Search or Create Patient ==========
async function searchPatientByNIK(token: string, nik: string): Promise<string | null> {
    console.log("\n=== Step 2a: Searching Patient by NIK ===");
    console.log(`   - NIK: ${nik}`);
    
    const url = `${BASE_URL}/Patient?identifier=https://fhir.kemkes.go.id/id/nik|${nik}`;
    
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        const error = await response.text();
        console.log(`⚠️  Failed to search patient: ${response.status} - ${error}`);
        return null;
    }

    const bundle = await response.json();
    
    if (bundle.total > 0 && bundle.entry && bundle.entry.length > 0) {
        const patientId = bundle.entry[0].resource.id;
        console.log(`✅ Patient found: ${patientId}`);
        console.log(`   - Name: ${bundle.entry[0].resource.name[0].text}`);
        return patientId;
    }
    
    console.log("ℹ️  Patient not found, will create new patient");
    return null;
}

async function createPatient(token: string): Promise<string> {
    console.log("\n=== Step 2b: Creating Patient ===");
    
    const patientPayload = {
        resourceType: "Patient",
        meta: {
            profile: ["https://fhir.kemkes.go.id/r4/StructureDefinition/Patient"],
        },
        identifier: [
            {
                use: "official",
                system: "https://fhir.kemkes.go.id/id/nik",
                value: TEST_PATIENT.nik,
            },
        ],
        active: true,
        name: [
            {
                use: "official",
                text: TEST_PATIENT.name,
            },
        ],
        gender: TEST_PATIENT.gender,
        birthDate: TEST_PATIENT.birthDate,
        deceasedBoolean: false,
        address: [
            {
                use: "home",
                line: TEST_PATIENT.address.line,
                city: TEST_PATIENT.address.city,
                postalCode: TEST_PATIENT.address.postalCode,
                country: "ID",
                extension: [
                    {
                        url: "https://fhir.kemkes.go.id/r4/StructureDefinition/administrativeCode",
                        extension: [
                            { url: "province", valueCode: TEST_PATIENT.address.province },
                            { url: "city", valueCode: TEST_PATIENT.address.cityCode },
                            { url: "district", valueCode: TEST_PATIENT.address.district },
                            { url: "village", valueCode: TEST_PATIENT.address.village },
                            { url: "rw", valueCode: TEST_PATIENT.address.rw },
                            { url: "rt", valueCode: TEST_PATIENT.address.rt },
                        ],
                    },
                ],
            },
        ],
        maritalStatus: {
            coding: [
                {
                    system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
                    code: TEST_PATIENT.maritalStatus,
                    display: "Unmarried",
                },
            ],
            text: "Unmarried",
        },
        multipleBirthInteger: 0,
        contact: [
            {
                relationship: [
                    {
                        coding: [
                            {
                                system: "http://terminology.hl7.org/CodeSystem/v2-0131",
                                code: "C",
                            },
                        ],
                    },
                ],
                name: {
                    use: "official",
                    text: TEST_PATIENT.contact.name,
                },
                telecom: [
                    {
                        system: "phone",
                        value: TEST_PATIENT.contact.phone,
                        use: "mobile",
                    },
                ],
            },
        ],
        communication: [
            {
                language: {
                    coding: [
                        {
                            system: "urn:ietf:bcp:47",
                            code: "id-ID",
                            display: "Indonesian",
                        },
                    ],
                    text: "Indonesian",
                },
                preferred: true,
            },
        ],
    };

    const response = await fetch(`${BASE_URL}/Patient`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(patientPayload),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create patient: ${response.status} - ${error}`);
    }

    const patient = await response.json();
    console.log(`✅ Patient created: ${patient.id}`);
    console.log(`   - Name: ${patient.name[0].text}`);
    console.log(`   - NIK: ${patient.identifier[0].value}`);
    
    return patient.id;
}

// ========== Step 3: Create Encounter ==========
async function createEncounter(token: string, patientId: string): Promise<string> {
    console.log("\n=== Step 3: Creating Encounter ===");
    
    const registrationId = `REG-${Date.now()}`;
    const now = new Date().toISOString();
    
    const encounterPayload: any = {
        resourceType: "Encounter",
        identifier: [
            {
                system: `http://sys-ids.kemkes.go.id/encounter/${ORGANIZATION_ID}`,
                value: registrationId,
            },
        ],
        status: "arrived",
        class: {
            system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            code: "AMB",
            display: "ambulatory",
        },
        subject: {
            reference: `Patient/${patientId}`,
            display: TEST_PATIENT.name,
        },
        participant: [
            {
                type: [
                    {
                        coding: [
                            {
                                system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                                code: "ATND",
                                display: "attender",
                            },
                        ],
                    },
                ],
                individual: {
                    reference: `Practitioner/${TEST_PRACTITIONER.id}`,
                    display: TEST_PRACTITIONER.name,
                },
            },
        ],
        period: {
            start: now,
        },
    };

    // Location is REQUIRED by Satu Sehat
    encounterPayload.location = [
        {
            location: {
                reference: `Location/${TEST_LOCATION.id}`,
                display: TEST_LOCATION.name,
            },
            period: {
                start: now,
            },
            extension: [
                {
                    url: "https://fhir.kemkes.go.id/r4/StructureDefinition/ServiceClass",
                    extension: [
                        {
                            url: "value",
                            valueCodeableConcept: {
                                coding: [
                                    {
                                        system: "http://terminology.kemkes.go.id/CodeSystem/locationServiceClass-Outpatient",
                                        code: "reguler",
                                        display: "Kelas Reguler",
                                    },
                                ],
                            },
                        },
                        {
                            url: "upgradeClassIndicator",
                            valueCodeableConcept: {
                                coding: [
                                    {
                                        system: "http://terminology.kemkes.go.id/CodeSystem/locationUpgradeClass",
                                        code: "kelas-tetap",
                                        display: "Kelas Tetap Perawatan",
                                    },
                                ],
                            },
                        },
                    ],
                },
            ],
        },
    ];

    encounterPayload.statusHistory = [
        {
            status: "arrived",
            period: {
                start: now,
            },
        },
    ];
    
    encounterPayload.serviceProvider = {
        reference: `Organization/${ORGANIZATION_ID}`,
    };

    const response = await fetch(`${BASE_URL}/Encounter`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(encounterPayload),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create encounter: ${response.status} - ${error}`);
    }

    const encounter = await response.json();
    console.log(`✅ Encounter created: ${encounter.id}`);
    console.log(`   - Registration ID: ${registrationId}`);
    console.log(`   - Status: ${encounter.status}`);
    console.log(`   - Class: ${encounter.class.display}`);
    
    return encounter.id;
}

// ========== Step 4: Generate Full Order Payload ==========
function generateOrderPayload(patientId: string, encounterId: string) {
    console.log("\n=== Step 4: Generating Order Payload ===");
    
    const scheduleDate = new Date();
    scheduleDate.setDate(scheduleDate.getDate() + 1); // Besok
    scheduleDate.setHours(10, 0, 0, 0); // Jam 10 pagi
    
    const orderPayload = {
        id_pelayanan: `PEL-${Date.now()}`,
        details: [
            {
                id_loinc: "dbdd786d-a4f5-4fa1-90e1-eccca959c2a7", // Ganti dengan LOINC ID yang valid dari database
                schedule_date: scheduleDate.toISOString(),
                order_priority: "ROUTINE" as const,
                notes: "Pasien tidak puasa",
                service_request: {
                    code: {
                        coding: [
                            {
                                system: "http://loinc.org",
                                code: "36687-2",
                                display: "XR Chest AP and Lateral",
                            },
                        ],
                        text: "Pemeriksaan X-Ray Thorax PA",
                    },
                    orderDetail: [
                        {
                            coding: [
                                {
                                    system: "http://dicom.nema.org/resources/ontology/DCM",
                                    code: "DX",
                                },
                            ],
                            text: "Modality Code: DX",
                        },
                        {
                            coding: [
                                {
                                    system: "http://sys-ids.kemkes.go.id/ae-title",
                                    display: "XR0001",
                                },
                            ],
                        },
                    ],
                    subject: {
                        reference: `Patient/${patientId}`,
                        patient_name: TEST_PATIENT.name,
                        patient_mrn: "MR-2023-0001",
                        patient_birth_date: TEST_PATIENT.birthDate,
                        patient_age: new Date().getFullYear() - new Date(TEST_PATIENT.birthDate).getFullYear(),
                        patient_gender: TEST_PATIENT.gender === "male" ? "MALE" : "FEMALE",
                    },
                    encounter: {
                        reference: `Encounter/${encounterId}`,
                    },
                    requester: {
                        reference: `Practitioner/${TEST_PRACTITIONER.id}`,
                        display: TEST_PRACTITIONER.name,
                    },
                    performer: [
                        {
                            reference: "Practitioner/10012572188",
                            display: "dr. Ahmad Radiologi, Sp.Rad",
                        },
                    ],
                    reasonCode: [
                        {
                            coding: [
                                {
                                    system: "http://hl7.org/fhir/sid/icd-10",
                                    code: "J18.9",
                                    display: "Pneumonia, unspecified organism",
                                },
                            ],
                        },
                    ],
                },
            },
        ],
    };

    console.log("✅ Order payload generated");
    console.log(`   - ID Pelayanan: ${orderPayload.id_pelayanan}`);
    console.log(`   - Schedule: ${scheduleDate.toLocaleString("id-ID")}`);
    console.log(`   - Patient: ${patientId}`);
    console.log(`   - Encounter: ${encounterId}`);
    
    return orderPayload;
}

// ========== Step 5: Test Create Order via API ==========
async function testCreateOrder(orderPayload: any) {
    console.log("\n=== Step 5: Testing Create Order ===");
    console.log("ℹ️  You can now use this payload to test your /api/orders/simrs endpoint");
    console.log("\nFull Payload:");
    console.log(JSON.stringify(orderPayload, null, 2));
    
    console.log("\n\nCURL Command:");
    console.log(`curl -X POST http://localhost:3000/api/orders/simrs \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\`);
    console.log(`  -d '${JSON.stringify(orderPayload, null, 2)}'`);
}

// ========== Main Execution ==========
async function main() {
    try {
        console.log("╔════════════════════════════════════════════════════════════╗");
        console.log("║       Satu Sehat Full Flow Testing Script                 ║");
        console.log("╚════════════════════════════════════════════════════════════╝");
        
        // Step 1: Get Token
        const token = await getAccessToken();
        // Check if required data is configured
        if (TEST_LOCATION.id === "b4362ccb-148b-4f74-b334-269bbff74f02") {
            console.log("\n⚠️  WARNING: Using default Location ID!");
            console.log("   This will likely fail. Please set TEST_LOCATION_ID env var");
            console.log("   or edit the script with your valid Location ID.\n");
            console.log("   To find your location: GET {{base_url}}/Location\n");
        }
        
        // 
        // Step 2: Search or Create Patient
        let patientId = await searchPatientByNIK(token, TEST_PATIENT.nik);
        if (!patientId) {
            patientId = await createPatient(token);
        }
        
        // Step 3: Create Encounter
        const encounterId = await createEncounter(token, patientId);
        
        // Step 4: Generate Order Payload
        const orderPayload = generateOrderPayload(patientId, encounterId);
        
        // Step 5: Show how to test
        await testCreateOrder(orderPayload);
        
        console.log("\n╔════════════════════════════════════════════════════════════╗");
        console.log("║                    ✅ SUCCESS!                             ║");
        console.log("╚════════════════════════════════════════════════════════════╝");
        console.log("\n📋 Summary:");
        console.log(`   - Patient ID: ${patientId}`);
        console.log(`   - Encounter ID: ${encounterId}`);
        console.log(`   - Ready to create order!`);
        
        console.log("\n📝 Next Steps:");
        console.log("   1. Copy the payload above");
        console.log("   2. Test via Postman or curl with your JWT token");
        console.log("   3. Check if ServiceRequest is sent to Satu Sehat automatically");
        console.log("   4. Verify MWL push works correctly\n");
        
    } catch (error) {
        console.error("\n❌ Error:", error instanceof Error ? error.message : error);
        console.error("\nFull error:", error);
        process.exit(1);
    }
}

// Run the script
main();
