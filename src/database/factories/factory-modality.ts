import { faker } from "@faker-js/faker";
import type { InferInsertModel } from "drizzle-orm";
import type { modalityTable } from "@/database/schemas/schema-modality";

type ModalityInsert = InferInsertModel<typeof modalityTable>;

// Daftar modality radiologi yang umum digunakan
const commonModalities = [
    {
        code: "CR",
        name: "X-Ray",
        aet: ["Xray0001", "Xray0002"],
        description: "Pemeriksaan Xray",
    },
    {
        code: "CT",
        name: "Computed Tomography",
        aet: ["CTScan0001", "CTScan0002"],
        description: "Pemeriksaan CT Scan",
    },
    {
        code: "US",
        name: "Ultrasound",
        aet: ["USG0001", "USG0002"],
        description: "Pemeriksan USG",
    },
    {
        code: "US",
        name: "Ultrasound",
        aet: ["Echocardio0001", "Echocardio0002"],
        description: "Pemeriksan Echocardio",
    },
    {
        code: "PX",
        name: "Computed Tomography",
        aet: ["Panoramic0001", "Panoramic0002"],
        description: "Pemeriksaan Panoramic",
    },
];

export function createModalityFactory(data?: Partial<ModalityInsert>): ModalityInsert {
    const randomModality = faker.helpers.arrayElement(commonModalities);

    return {
        code: data?.code ?? randomModality.code,
        name: data?.name ?? randomModality.name,
        aet: data?.aet ?? randomModality.aet,
        description: data?.description ?? randomModality.description,
        is_active: data?.is_active ?? true,
        created_at: data?.created_at ?? new Date(),
        updated_at: data?.updated_at ?? undefined,
    };
}

// Helper function untuk generate multiple modalities
export function createManyModalityFactories(count: number): ModalityInsert[] {
    const factories: ModalityInsert[] = [];
    const usedCodes = new Set<string>();

    for (let i = 0; i < Math.min(count, commonModalities.length); i++) {
        const modality = commonModalities[i];
        if (!usedCodes.has(modality.code)) {
            factories.push(createModalityFactory(modality));
            usedCodes.add(modality.code);
        }
    }

    return factories;
}

// Export all modalities
export function getAllModalities(): ModalityInsert[] {
    return commonModalities.map((modality) => createModalityFactory(modality));
}
