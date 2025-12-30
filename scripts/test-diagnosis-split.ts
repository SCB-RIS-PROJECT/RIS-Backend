/**
 * Test script for diagnosis split functionality
 * Tests creating order from SIMRS and updating diagnosis from RIS
 */

import env from "@/config/env";

const BASE_URL = `http://localhost:${env.PORT}` || "http://localhost:3000";
const AUTH_TOKEN = "YOUR_AUTH_TOKEN_HERE"; // Replace with actual token

interface TestResult {
    name: string;
    success: boolean;
    message: string;
    data?: any;
}

const results: TestResult[] = [];

async function testCreateOrderWithDiagnosis() {
    console.log("\n=== Test 1: Create Order from SIMRS with Diagnosis ===");
    
    try {
        const response = await fetch(`${BASE_URL}/api/orders/simrs`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${AUTH_TOKEN}`
            },
            body: JSON.stringify({
                id_pelayanan: `TEST-${Date.now()}`,
                details: [{
                    ccurence_date_time: new Date().toISOString(),
                    order_priority: "ROUTINE",
                    notes: "Test order dengan diagnosis",
                    pemeriksaan: {
                        system: "http://loinc.org",
                        code: "36687-2",
                        display: "Thorax X-Ray",
                        text: "Foto thorax PA"
                    },
                    subject: {
                        ihs_id: "P-TEST-123",
                        patient_name: "Test Patient",
                        patient_mrn: `MRN-TEST-${Date.now()}`,
                        patient_birth_date: "1990-01-01",
                        patient_age: 35,
                        patient_gender: "MALE"
                    },
                    encounter: {
                        encounter_id: `ENC-TEST-${Date.now()}`
                    },
                    requester: {
                        id_practitioner: "PRACT-TEST-001",
                        name_practitioner: "Dr. Test"
                    },
                    diagnosa: {
                        system: "http://hl7.org/fhir/sid/icd-10",
                        code: "J18.9",
                        display: "Pneumonia, unspecified organism"
                    }
                }]
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            results.push({
                name: "Create Order with Diagnosis",
                success: true,
                message: "Order created successfully",
                data: data
            });
            console.log("✅ Success:", data);
            return data;
        } else {
            results.push({
                name: "Create Order with Diagnosis",
                success: false,
                message: data.message || "Failed to create order",
                data: data
            });
            console.log("❌ Failed:", data);
            return null;
        }
    } catch (error) {
        results.push({
            name: "Create Order with Diagnosis",
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
        console.log("❌ Error:", error);
        return null;
    }
}

async function testGetOrder(orderId: string) {
    console.log("\n=== Test 2: Get Order and Verify Diagnosis Format ===");
    
    try {
        const response = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
            headers: {
                "Authorization": `Bearer ${AUTH_TOKEN}`
            }
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log("✅ Order retrieved");
            console.log("Diagnosis format:", JSON.stringify(data.details[0]?.diagnosis, null, 2));
            
            // Verify diagnosis format
            const diagnosis = data.details[0]?.diagnosis;
            if (diagnosis && diagnosis.code && diagnosis.display) {
                results.push({
                    name: "Get Order - Verify Diagnosis Format",
                    success: true,
                    message: "Diagnosis format is correct (object with code and display)",
                    data: { diagnosis }
                });
                console.log("✅ Diagnosis format verified: { code, display }");
                return data;
            } else {
                results.push({
                    name: "Get Order - Verify Diagnosis Format",
                    success: false,
                    message: "Diagnosis format is incorrect",
                    data: { diagnosis }
                });
                console.log("❌ Diagnosis format incorrect:", diagnosis);
                return data;
            }
        } else {
            results.push({
                name: "Get Order - Verify Diagnosis Format",
                success: false,
                message: data.message || "Failed to get order"
            });
            console.log("❌ Failed:", data);
            return null;
        }
    } catch (error) {
        results.push({
            name: "Get Order - Verify Diagnosis Format",
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
        console.log("❌ Error:", error);
        return null;
    }
}

async function testUpdateDiagnosis(orderId: string, detailId: string) {
    console.log("\n=== Test 3: Update Diagnosis from RIS ===");
    
    try {
        const response = await fetch(`${BASE_URL}/api/orders/${orderId}/details/${detailId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${AUTH_TOKEN}`
            },
            body: JSON.stringify({
                diagnosis: {
                    code: "J18.0",
                    display: "Bronchopneumonia, unspecified organism"
                },
                notes: "Diagnosis diupdate oleh radiolog setelah review hasil"
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log("✅ Diagnosis updated");
            console.log("New diagnosis:", JSON.stringify(data.diagnosis, null, 2));
            
            // Verify updated diagnosis
            if (data.diagnosis?.code === "J18.0" && data.diagnosis?.display === "Bronchopneumonia, unspecified organism") {
                results.push({
                    name: "Update Diagnosis from RIS",
                    success: true,
                    message: "Diagnosis updated successfully",
                    data: { diagnosis: data.diagnosis }
                });
                console.log("✅ Diagnosis update verified");
                return data;
            } else {
                results.push({
                    name: "Update Diagnosis from RIS",
                    success: false,
                    message: "Diagnosis not updated correctly",
                    data: { diagnosis: data.diagnosis }
                });
                console.log("❌ Diagnosis update failed");
                return data;
            }
        } else {
            results.push({
                name: "Update Diagnosis from RIS",
                success: false,
                message: data.message || "Failed to update diagnosis"
            });
            console.log("❌ Failed:", data);
            return null;
        }
    } catch (error) {
        results.push({
            name: "Update Diagnosis from RIS",
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
        console.log("❌ Error:", error);
        return null;
    }
}

async function testUpdateWithoutDiagnosis(orderId: string, detailId: string) {
    console.log("\n=== Test 4: Update Without Changing Diagnosis ===");
    
    try {
        const response = await fetch(`${BASE_URL}/api/orders/${orderId}/details/${detailId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${AUTH_TOKEN}`
            },
            body: JSON.stringify({
                order_status: "IN_PROGRESS",
                notes: "Pemeriksaan sedang berlangsung"
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log("✅ Order updated without changing diagnosis");
            console.log("Diagnosis unchanged:", JSON.stringify(data.diagnosis, null, 2));
            
            // Verify diagnosis remains the same
            if (data.diagnosis?.code === "J18.0") {
                results.push({
                    name: "Update Without Changing Diagnosis",
                    success: true,
                    message: "Diagnosis preserved correctly",
                    data: { diagnosis: data.diagnosis }
                });
                console.log("✅ Diagnosis preserved");
                return data;
            } else {
                results.push({
                    name: "Update Without Changing Diagnosis",
                    success: false,
                    message: "Diagnosis changed unexpectedly"
                });
                console.log("❌ Diagnosis changed unexpectedly");
                return data;
            }
        } else {
            results.push({
                name: "Update Without Changing Diagnosis",
                success: false,
                message: data.message || "Failed to update"
            });
            console.log("❌ Failed:", data);
            return null;
        }
    } catch (error) {
        results.push({
            name: "Update Without Changing Diagnosis",
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
        console.log("❌ Error:", error);
        return null;
    }
}

async function runTests() {
    console.log("=================================================");
    console.log("     DIAGNOSIS SPLIT FUNCTIONALITY TEST");
    console.log("=================================================");
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Auth Token: ${AUTH_TOKEN.substring(0, 20)}...`);
    
    // Test 1: Create order
    const createResult = await testCreateOrderWithDiagnosis();
    if (!createResult) {
        console.log("\n❌ Cannot proceed with tests - order creation failed");
        console.log("\nPlease:");
        console.log("1. Make sure the server is running");
        console.log("2. Replace AUTH_TOKEN with a valid token");
        console.log("3. Make sure you have proper permissions");
        return;
    }

    // Extract order ID and detail ID from response
    // Note: Adjust this based on your actual response structure
    const orderId = createResult.order?.id || createResult.id;
    const detailId = createResult.order?.details?.[0]?.id || createResult.details?.[0]?.id;

    if (!orderId || !detailId) {
        console.log("\n❌ Cannot proceed - missing order ID or detail ID");
        console.log("Response:", createResult);
        return;
    }

    console.log(`\nOrder ID: ${orderId}`);
    console.log(`Detail ID: ${detailId}`);

    // Test 2: Get order and verify format
    await testGetOrder(orderId);

    // Test 3: Update diagnosis
    await testUpdateDiagnosis(orderId, detailId);

    // Test 4: Update without diagnosis
    await testUpdateWithoutDiagnosis(orderId, detailId);

    // Print summary
    console.log("\n=================================================");
    console.log("                 TEST SUMMARY");
    console.log("=================================================");
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log("\nDetails:");
    
    results.forEach((result, index) => {
        const icon = result.success ? "✅" : "❌";
        console.log(`${index + 1}. ${icon} ${result.name}`);
        console.log(`   ${result.message}`);
    });
    
    console.log("\n=================================================");
}

// Run tests
runTests().catch(console.error);
