/**
 * Helper Script: Get Satu Sehat Locations
 * 
 * This script helps you find valid Location IDs from your organization in Satu Sehat
 * 
 * Usage: bun run scripts/get-satusehat-location.ts
 */

import env from "@/config/env";

const AUTH_URL = env.SATU_SEHAT_AUTH_URL;
const BASE_URL = env.SATU_SEHAT_BASE_URL;
const CLIENT_ID = env.SATU_SEHAT_CLIENT_ID;
const CLIENT_SECRET = env.SATU_SEHAT_CLIENT_SECRET;
const ORGANIZATION_ID = env.SATU_SEHAT_ORGANIZATION_ID;

async function getAccessToken(): Promise<string> {
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
        throw new Error(`Failed to get token: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
}

async function getLocations(token: string) {
    console.log("\n=== Fetching Locations from Satu Sehat ===\n");
    
    // Try multiple approaches to find locations
    const queries = [
        { desc: "Locations for your organization", url: `${BASE_URL}/Location?organization=${ORGANIZATION_ID}&_count=20` },
        { desc: "All locations (first 20)", url: `${BASE_URL}/Location?_count=20` },
        { desc: "Active locations", url: `${BASE_URL}/Location?status=active&_count=20` },
    ];

    let foundLocations = false;

    for (const query of queries) {
        console.log(`\n📍 Trying: ${query.desc}`);
        console.log(`   URL: ${query.url}`);
        
        const response = await fetch(query.url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            console.log(`   ❌ Failed: ${response.status}`);
            continue;
        }

        const bundle = await response.json();
        
        if (bundle.total === 0 || !bundle.entry || bundle.entry.length === 0) {
            console.log(`   ℹ️  No locations found`);
            continue;
        }

        foundLocations = true;
        console.log(`   ✅ Found ${bundle.total} location(s)\n`);
        console.log("═══════════════════════════════════════════════════════════════");
        
        for (const entry of bundle.entry.slice(0, 10)) { // Show max 10
            const location = entry.resource;
            console.log(`\n📍 Location ID: ${location.id}`);
            console.log(`   Name: ${location.name || "N/A"}`);
            console.log(`   Status: ${location.status || "N/A"}`);
            if (location.type?.[0]?.coding?.[0]?.display) {
                console.log(`   Type: ${location.type[0].coding[0].display}`);
            }
            if (location.physicalType?.coding?.[0]?.display) {
                console.log(`   Physical Type: ${location.physicalType.coding[0].display}`);
            }
            if (location.managingOrganization) {
                console.log(`   Organization: ${location.managingOrganization.reference}`);
            }
        }

        console.log("\n═══════════════════════════════════════════════════════════════");
        console.log("\n\n📋 To use in test script:");
        console.log("═══════════════════════════════════════════════════════════════\n");
        
        const firstLocation = bundle.entry[0].resource;
        console.log("Option 1: Set environment variable:");
        console.log(`export TEST_LOCATION_ID="${firstLocation.id}"`);
        console.log(`export TEST_LOCATION_NAME="${firstLocation.name || "Location"}"`);
        
        console.log("\nOption 2: Edit test-satusehat-full-flow.ts:");
        console.log(`const TEST_LOCATION = {`);
        console.log(`    id: "${firstLocation.id}",`);
        console.log(`    name: "${firstLocation.name || "Location"}",`);
        console.log(`};\n`);

        break; // Stop after finding locations
    }

    if (!foundLocations) {
        console.log("\n\n❌ No locations found with any query.");
        console.log("\nPossible solutions:");
        console.log("1. Register locations in Satu Sehat Portal");
        console.log("2. Contact Satu Sehat support");
        console.log("3. For testing, create a minimal encounter without location (if allowed)\n");
    }
}

async function main() {
    try {
        console.log("╔════════════════════════════════════════════════════════════╗");
        console.log("║       Get Satu Sehat Location IDs                         ║");
        console.log("╚════════════════════════════════════════════════════════════╝");
        
        const token = await getAccessToken();
        console.log("✅ Token obtained\n");
        
        await getLocations(token);
        
    } catch (error) {
        console.error("\n❌ Error:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

main();
