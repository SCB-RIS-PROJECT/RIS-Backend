import type { InferInsertModel } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { loggerPino } from "@/config/log";
import db from "@/database/db";
import { loincTable } from "@/database/schemas/schema-loinc";
import { modalityTable } from "@/database/schemas/schema-modality";

type LoincInsert = InferInsertModel<typeof loincTable>;

/**
 * Get modality ID by code
 */
async function getModalityIdByCode(code: string): Promise<string> {
    const [modality] = await db.select().from(modalityTable).where(eq(modalityTable.code, code)).limit(1);

    if (!modality) {
        throw new Error(`Modality with code ${code} not found`);
    }

    return modality.id;
}

export async function seedLoinc() {
    try {
        loggerPino.info("🌱 Seeding LOINC data...");

        // Get modality IDs
        const xrModalityId = await getModalityIdByCode("XR");
        const usModalityId = await getModalityIdByCode("US");
        const ctModalityId = await getModalityIdByCode("CT");

        // LOINC data from Excel (10 rows)
        const loincData: LoincInsert[] = [
            {
                id_modality: xrModalityId,
                code: "RAD-XR-001",
                name: "Cervical AP/Lat",
                loinc_code: "24919-3",
                loinc_display: "XR Skull AP and Lateral",
                loinc_system: "http://loinc.org",
                require_fasting: false,
                require_pregnancy_check: false,
                require_use_contrast: false,
                contrast_name: null,
                contrast_kfa_code: null,
                created_at: new Date(),
            },
            {
                id_modality: xrModalityId,
                code: "RAD-XR-002",
                name: "Thorax AP/Lat",
                loinc_code: "36687-2",
                loinc_display: "XR Chest AP and Lateral",
                loinc_system: "http://loinc.org",
                require_fasting: false,
                require_pregnancy_check: true,
                require_use_contrast: false,
                contrast_name: null,
                contrast_kfa_code: null,
                created_at: new Date(),
            },
            {
                id_modality: xrModalityId,
                code: "RAD-XR-003",
                name: "Polos Abdomen (BNO)",
                loinc_code: "36293-9",
                loinc_display: "XR Abdomen 3 Views",
                loinc_system: "http://loinc.org",
                require_fasting: true,
                require_pregnancy_check: true,
                require_use_contrast: false,
                contrast_name: null,
                contrast_kfa_code: null,
                created_at: new Date(),
            },
            {
                id_modality: xrModalityId,
                code: "RAD-XR-004",
                name: "Cervical AP/Lat",
                loinc_code: "24942-5",
                loinc_display: "XR Cervical spine AP and Lateral",
                loinc_system: "http://loinc.org",
                require_fasting: false,
                require_pregnancy_check: false,
                require_use_contrast: false,
                contrast_name: null,
                contrast_kfa_code: null,
                created_at: new Date(),
            },
            {
                id_modality: xrModalityId,
                code: "RAD-XR-005",
                name: "Clavicula AP",
                loinc_code: "36573-4",
                loinc_display: "XR Clavicle AP",
                loinc_system: "http://loinc.org",
                require_fasting: false,
                require_pregnancy_check: false,
                require_use_contrast: false,
                contrast_name: null,
                contrast_kfa_code: null,
                created_at: new Date(),
            },
            {
                id_modality: ctModalityId,
                code: "RAD-XR-006",
                name: "IVP",
                loinc_code: "24788-2",
                loinc_display: "XR Kidney - bilateral Views W contrast IV (IVP)",
                loinc_system: "http://loinc.org",
                require_fasting: true,
                require_pregnancy_check: true,
                require_use_contrast: true,
                contrast_name: "Iohexol injeksi 350 mg/ml (IV)",
                contrast_kfa_code: "92003638",
                created_at: new Date(),
            },
            {
                id_modality: usModalityId,
                code: "RAD-US-001",
                name: "USG Abdomen / Full",
                loinc_code: "24558-9",
                loinc_display: "US Abdomen",
                loinc_system: "http://loinc.org",
                require_fasting: true,
                require_pregnancy_check: false,
                require_use_contrast: false,
                contrast_name: null,
                contrast_kfa_code: null,
                created_at: new Date(),
            },
            {
                id_modality: ctModalityId,
                code: "RAD-CT-001",
                name: "CT Scan kepala tanpa kontras",
                loinc_code: "30799-1",
                loinc_display: "CT Head WO contrast",
                loinc_system: "http://loinc.org",
                require_fasting: false,
                require_pregnancy_check: true,
                require_use_contrast: false,
                contrast_name: null,
                contrast_kfa_code: null,
                created_at: new Date(),
            },
            {
                id_modality: ctModalityId,
                code: "RAD-CT-002",
                name: "CT Scan kepala axial dengan kontras",
                loinc_code: "24727-0",
                loinc_display: "CT Head W contrast IV",
                loinc_system: "http://loinc.org",
                require_fasting: true,
                require_pregnancy_check: true,
                require_use_contrast: true,
                contrast_name: "Iohexol injeksi 350 mg/ml (IV)",
                contrast_kfa_code: "92003638",
                created_at: new Date(),
            },
            {
                id_modality: ctModalityId,
                code: "RAD-XR-007",
                name: "XR Panoramic Maxillofacial",
                loinc_code: "24828-6",
                loinc_display: "XR Teeth Visible Panoramic",
                loinc_system: "http://loinc.org",
                require_fasting: false,
                require_pregnancy_check: false,
                require_use_contrast: false,
                contrast_name: null,
                contrast_kfa_code: null,
                created_at: new Date(),
            },
        ];

        // Insert LOINC data
        await db.insert(loincTable).values(loincData).onConflictDoNothing();

        loggerPino.info(`✅ Successfully seeded ${loincData.length} LOINC codes`);
    } catch (error) {
        loggerPino.error({ error }, "❌ Failed to seed LOINC data");
        throw error;
    }
}
