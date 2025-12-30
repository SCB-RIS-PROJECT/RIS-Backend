// biome-ignore-all lint/suspicious/noConsole: <because seeder>

import type { InferInsertModel } from "drizzle-orm";
import db from "@/database/db";
import type { modalityTable } from "@/database/schemas/schema-modality";
import { modalityTable as table } from "@/database/schemas/schema-modality";

type ModalityInsert = InferInsertModel<typeof modalityTable>;

// Modality yang umum digunakan di Indonesia (fokus pada XR, US, CT)
const modalityData: ModalityInsert[] = [
    {
        code: "CR",
        name: "X-Ray",
        aet: ["Xray0001", "Xray0002"],
        description: "Pemeriksaan Xray",
        is_active: true,
        created_at: new Date(),
    },
    {
        code: "CT",
        name: "Computed Tomography",
        aet: ["CTScan0001", "CTScan0002"],
        description: "Pemeriksaan CT Scan",
        is_active: true,
        created_at: new Date(),
    },
    {
        code: "US",
        name: "Ultrasound",
        aet: ["USG0001", "USG0002"],
        description: "Pemeriksan USG",
        is_active: true,
        created_at: new Date(),
    },
    {
        code: "US",
        name: "Ultrasound",
        aet: ["Echocardio0001", "Echocardio0002"],
        description: "Pemeriksan Echocardio",
        is_active: true,
        created_at: new Date(),
    },
    {
        code: "PX",
        name: "Computed Tomography",
        aet: ["Panoramic0001", "Panoramic0002"],
        description: "Pemeriksaan Panoramic",
        is_active: true,
        created_at: new Date(),
    },
];

export async function seedModality() {
    try {
        console.log("🌱 Seeding Modality data...");

        // Insert all modalities
        await db.insert(table).values(modalityData).onConflictDoNothing();

        console.log(`✅ Successfully seeded ${modalityData.length} modalities`);
    } catch (error) {
        console.log("❌ Failed to seed Modality data", error);
        throw error;
    }
}
