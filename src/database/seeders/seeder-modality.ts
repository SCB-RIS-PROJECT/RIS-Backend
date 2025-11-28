import type { InferInsertModel } from "drizzle-orm";
import { loggerPino } from "@/config/log";
import db from "@/database/db";
import type { modalityTable } from "@/database/schemas/schema-modality";
import { modalityTable as table } from "@/database/schemas/schema-modality";

type ModalityInsert = InferInsertModel<typeof modalityTable>;

// Modality yang umum digunakan di Indonesia (fokus pada XR, US, CT)
const modalityData: ModalityInsert[] = [
    {
        code: "XR",
        name: "X-Ray",
        description: "Radiografi konvensional menggunakan sinar-X untuk menghasilkan gambar struktur internal tubuh",
        is_active: true,
        created_at: new Date(),
    },
    {
        code: "US",
        name: "Ultrasound",
        description:
            "Ultrasonografi menggunakan gelombang suara frekuensi tinggi untuk menghasilkan gambar organ dalam",
        is_active: true,
        created_at: new Date(),
    },
    {
        code: "CT",
        name: "Computed Tomography",
        description: "CT Scan menggunakan sinar-X dan komputer untuk menghasilkan gambar potongan melintang tubuh",
        is_active: true,
        created_at: new Date(),
    },
];

export async function seedModality() {
    try {
        loggerPino.info("🌱 Seeding Modality data...");

        // Insert all modalities
        await db.insert(table).values(modalityData).onConflictDoNothing();

        loggerPino.info(`✅ Successfully seeded ${modalityData.length} modalities`);
    } catch (error) {
        loggerPino.error({ error }, "❌ Failed to seed Modality data");
        throw error;
    }
}
