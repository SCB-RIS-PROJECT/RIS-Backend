#!/usr/bin/env bun
/**
 * Add Missing Modalities
 * Add common modalities that are missing from database
 */

import db from "../src/database/db";
import { modalityTable } from "../src/database/schemas/schema-modality";

const additionalModalities = [
    {
        code: "MR",
        name: "Magnetic Resonance",
        aet: ["MRI0001", "MRI0002"],
        description: "Pemeriksaan MRI (Magnetic Resonance Imaging)",
        is_active: true,
    },
    {
        code: "DX",
        name: "Digital Radiography",
        aet: ["DX0001", "DX0002"],
        description: "Pemeriksaan Digital X-Ray",
        is_active: true,
    },
];

async function addModalities() {
    console.log("Adding missing modalities...\n");

    for (const modality of additionalModalities) {
        try {
            const inserted = await db.insert(modalityTable)
                .values(modality)
                .returning();
            console.log(`✅ Added modality: ${modality.code} - ${modality.name}`);
        } catch (error: any) {
            if (error.message.includes("duplicate key")) {
                console.log(`⚠️  Modality ${modality.code} already exists`);
            } else {
                console.log(`❌ Error adding ${modality.code}: ${error.message}`);
            }
        }
    }

    console.log("\n✅ Done!");
    process.exit(0);
}

addModalities();
