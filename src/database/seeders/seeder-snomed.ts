// biome-ignore-all lint/suspicious/noConsole: <because seeder>

import type { InferInsertModel } from "drizzle-orm";
import db from "@/database/db";
import type { snomedTable } from "@/database/schemas/schema-snomed";
import { snomedTable as table } from "@/database/schemas/schema-snomed";

type SnomedInsert = InferInsertModel<typeof snomedTable>;

// SNOMED CT codes untuk Radiologi yang umum digunakan di Indonesia
const indonesiaRadiologySnomedCodes: SnomedInsert[] = [
    // === X-RAY / RONTGEN ===
    {
        code: "168537006",
        display: "Plain radiography",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "Radiografi konvensional / Foto Rontgen",
        active: true,
        created_at: new Date(),
    },
    {
        code: "399208008",
        display: "Plain chest X-ray",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "Foto Rontgen Thorax PA",
        active: true,
        created_at: new Date(),
    },
    {
        code: "399067008",
        display: "Lateral chest X-ray",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "Foto Rontgen Thorax Lateral",
        active: true,
        created_at: new Date(),
    },
    {
        code: "396205005",
        display: "Radiography of cervical spine",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "Foto Rontgen Cervical / Leher",
        active: true,
        created_at: new Date(),
    },
    {
        code: "396227006",
        display: "Radiography of lumbar spine",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "Foto Rontgen Lumbal / Pinggang",
        active: true,
        created_at: new Date(),
    },
    {
        code: "310005",
        display: "Radiography of skull",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "Foto Rontgen Kepala / Skull",
        active: true,
        created_at: new Date(),
    },
    {
        code: "44491008",
        display: "Radiography of pelvis",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "Foto Rontgen Pelvis",
        active: true,
        created_at: new Date(),
    },
    {
        code: "241622003",
        display: "Radiography of abdomen",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "Foto Polos Abdomen / BNO",
        active: true,
        created_at: new Date(),
    },

    // === CT SCAN ===
    {
        code: "77477000",
        display: "Computerized axial tomography",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "CT Scan",
        active: true,
        created_at: new Date(),
    },
    {
        code: "433112001",
        display: "Computed tomography of head",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "CT Scan Kepala / Head",
        active: true,
        created_at: new Date(),
    },
    {
        code: "432026009",
        display: "Computed tomography of chest",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "CT Scan Thorax",
        active: true,
        created_at: new Date(),
    },
    {
        code: "241615005",
        display: "Computed tomography of abdomen",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "CT Scan Abdomen",
        active: true,
        created_at: new Date(),
    },
    {
        code: "241684009",
        display: "Computed tomography of pelvis",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "CT Scan Pelvis",
        active: true,
        created_at: new Date(),
    },
    {
        code: "241686006",
        display: "Computed tomography of spine",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "CT Scan Spine / Tulang Belakang",
        active: true,
        created_at: new Date(),
    },

    // === MRI ===
    {
        code: "113091000",
        display: "Magnetic resonance imaging",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "MRI",
        active: true,
        created_at: new Date(),
    },
    {
        code: "241541005",
        display: "Magnetic resonance imaging of brain",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "MRI Otak / Brain",
        active: true,
        created_at: new Date(),
    },
    {
        code: "241570006",
        display: "Magnetic resonance imaging of spine",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "MRI Spine / Tulang Belakang",
        active: true,
        created_at: new Date(),
    },
    {
        code: "419254007",
        display: "Magnetic resonance imaging of abdomen",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "MRI Abdomen",
        active: true,
        created_at: new Date(),
    },
    {
        code: "241659009",
        display: "Magnetic resonance imaging of pelvis",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "MRI Pelvis",
        active: true,
        created_at: new Date(),
    },

    // === USG / ULTRASONOGRAPHY ===
    {
        code: "16310003",
        display: "Ultrasonography",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "USG",
        active: true,
        created_at: new Date(),
    },
    {
        code: "169070004",
        display: "Ultrasound scan of abdomen",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "USG Abdomen",
        active: true,
        created_at: new Date(),
    },
    {
        code: "426203004",
        display: "Ultrasound of pelvis",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "USG Pelvis",
        active: true,
        created_at: new Date(),
    },
    {
        code: "268445003",
        display: "Antenatal ultrasonography",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "USG Kehamilan / Obstetri",
        active: true,
        created_at: new Date(),
    },
    {
        code: "241486001",
        display: "Ultrasound scan of breast",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "USG Payudara",
        active: true,
        created_at: new Date(),
    },
    {
        code: "13301000087109",
        display: "Ultrasound of thyroid",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "USG Tiroid",
        active: true,
        created_at: new Date(),
    },

    // === MAMMOGRAFI ===
    {
        code: "72093006",
        display: "Mammography",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "Mammografi",
        active: true,
        created_at: new Date(),
    },
    {
        code: "241055006",
        display: "Screening mammography",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "Mammografi Skrining",
        active: true,
        created_at: new Date(),
    },

    // === FLUOROSCOPY / KONTRAS ===
    {
        code: "44491008",
        display: "Fluoroscopy",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "Fluoroskopi",
        active: true,
        created_at: new Date(),
    },
    {
        code: "241604007",
        display: "Barium swallow",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "Esofagografi / Barium Swallow",
        active: true,
        created_at: new Date(),
    },
    {
        code: "241617008",
        display: "Barium meal",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "Barium Meal",
        active: true,
        created_at: new Date(),
    },
    {
        code: "241605008",
        display: "Barium enema",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "Colon Inloop / Barium Enema",
        active: true,
        created_at: new Date(),
    },
    {
        code: "241625001",
        display: "Intravenous pyelography",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "IVP / Pielografi Intravena",
        active: true,
        created_at: new Date(),
    },

    // === DENTAL / PANORAMIC ===
    {
        code: "36328002",
        display: "Panoramic radiography of mandible",
        system: "http://snomed.info/sct",
        category: "Procedure",
        description: "Foto Panoramik / Dental Panoramik",
        active: true,
        created_at: new Date(),
    },
];

export async function seedSnomed() {
    try {
        console.log("🌱 Seeding SNOMED-CT codes...");

        await db.insert(table).values(indonesiaRadiologySnomedCodes).onConflictDoNothing();

        console.log(`✅ Successfully seeded ${indonesiaRadiologySnomedCodes.length} SNOMED-CT codes`);
    } catch (error) {
        console.error("❌ Failed to seed SNOMED-CT codes", error);
        throw error;
    }
}
