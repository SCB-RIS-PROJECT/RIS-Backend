import { faker } from "@faker-js/faker";
import type { InferInsertModel } from "drizzle-orm";
import type { modalityTable } from "@/database/schemas/schema-modality";

type ModalityInsert = InferInsertModel<typeof modalityTable>;

// Daftar modality radiologi yang umum digunakan
const commonModalities = [
    {
        code: "XR",
        name: "X-Ray",
        aet: "XRAY_AET",
        description: "Radiografi konvensional / Foto Rontgen",
    },
    {
        code: "US",
        name: "Ultrasound",
        aet: "US_AET",
        description: "Ultrasonografi / USG",
    },
    {
        code: "CT",
        name: "Computed Tomography",
        aet: "CT_AET",
        description: "CT Scan",
    },
    {
        code: "MR",
        name: "Magnetic Resonance Imaging",
        aet: "MR_AET",
        description: "MRI",
    },
    {
        code: "MG",
        name: "Mammography",
        aet: "MG_AET",
        description: "Mammografi",
    },
    {
        code: "CR",
        name: "Computed Radiography",
        aet: "CR_AET",
        description: "Radiografi Digital",
    },
    {
        code: "DX",
        name: "Digital Radiography",
        aet: "DX_AET",
        description: "Radiografi Digital",
    },
    {
        code: "RF",
        name: "Radiofluoroscopy",
        aet: "RF_AET",
        description: "Fluoroskopi",
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
