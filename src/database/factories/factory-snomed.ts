import { faker } from "@faker-js/faker";
import type { InferInsertModel } from "drizzle-orm";
import type { snomedTable } from "@/database/schemas/schema-snomed";

type SnomedInsert = InferInsertModel<typeof snomedTable>;

// Daftar SNOMED CT codes untuk radiologi/imaging yang umum digunakan
const commonRadiologySnomedCodes = [
    {
        code: "168537006",
        display: "Plain radiography",
        category: "Procedure",
        description: "Pemeriksaan radiografi konvensional",
    },
    {
        code: "77477000",
        display: "Computerized axial tomography",
        category: "Procedure",
        description: "Pemeriksaan CT Scan",
    },
    {
        code: "113091000",
        display: "Magnetic resonance imaging",
        category: "Procedure",
        description: "Pemeriksaan MRI",
    },
    {
        code: "16310003",
        display: "Ultrasonography",
        category: "Procedure",
        description: "Pemeriksaan USG",
    },
    {
        code: "399208008",
        display: "Plain chest X-ray",
        category: "Procedure",
        description: "Foto Rontgen Thorax",
    },
    {
        code: "433112001",
        display: "Computed tomography of head",
        category: "Procedure",
        description: "CT Scan Kepala",
    },
    {
        code: "241615005",
        display: "Computed tomography of abdomen",
        category: "Procedure",
        description: "CT Scan Abdomen",
    },
    {
        code: "169070004",
        display: "Ultrasound scan of abdomen",
        category: "Procedure",
        description: "USG Abdomen",
    },
    {
        code: "241541005",
        display: "Magnetic resonance imaging of brain",
        category: "Procedure",
        description: "MRI Otak",
    },
    {
        code: "396205005",
        display: "Radiography of cervical spine",
        category: "Procedure",
        description: "Foto Rontgen Cervical",
    },
    {
        code: "396227006",
        display: "Radiography of lumbar spine",
        category: "Procedure",
        description: "Foto Rontgen Lumbal",
    },
    {
        code: "399067008",
        display: "Lateral chest X-ray",
        category: "Procedure",
        description: "Foto Thorax Lateral",
    },
    {
        code: "241570006",
        display: "Magnetic resonance imaging of spine",
        category: "Procedure",
        description: "MRI Spine",
    },
    {
        code: "432026009",
        display: "Computed tomography of chest",
        category: "Procedure",
        description: "CT Scan Thorax",
    },
    {
        code: "241684009",
        display: "Computed tomography of pelvis",
        category: "Procedure",
        description: "CT Scan Pelvis",
    },
    {
        code: "310005",
        display: "Radiography of skull",
        category: "Procedure",
        description: "Foto Rontgen Kepala",
    },
    {
        code: "426203004",
        display: "Ultrasound of pelvis",
        category: "Procedure",
        description: "USG Pelvis",
    },
    {
        code: "72093006",
        display: "Mammography",
        category: "Procedure",
        description: "Mammografi",
    },
    {
        code: "241686006",
        display: "Computed tomography of spine",
        category: "Procedure",
        description: "CT Scan Spine",
    },
    {
        code: "419254007",
        display: "Magnetic resonance imaging of abdomen",
        category: "Procedure",
        description: "MRI Abdomen",
    },
];

export function createSnomedFactory(data?: Partial<SnomedInsert>): SnomedInsert {
    const randomSnomed = faker.helpers.arrayElement(commonRadiologySnomedCodes);

    return {
        code: data?.code ?? randomSnomed.code,
        display: data?.display ?? randomSnomed.display,
        system: data?.system ?? "http://snomed.info/sct",
        category: data?.category ?? randomSnomed.category,
        description: data?.description ?? randomSnomed.description,
        active: data?.active ?? true,
        created_at: data?.created_at ?? new Date(),
        updated_at: data?.updated_at ?? undefined,
    };
}

// Helper function untuk generate multiple SNOMED codes
export function createManySnomedFactories(count: number): SnomedInsert[] {
    const factories: SnomedInsert[] = [];
    const usedCodes = new Set<string>();

    for (let i = 0; i < Math.min(count, commonRadiologySnomedCodes.length); i++) {
        const snomed = commonRadiologySnomedCodes[i];
        if (!usedCodes.has(snomed.code)) {
            factories.push(createSnomedFactory(snomed));
            usedCodes.add(snomed.code);
        }
    }

    return factories;
}

// Export semua SNOMED codes yang tersedia
export function getAllRadiologySnomedCodes(): SnomedInsert[] {
    return commonRadiologySnomedCodes.map((snomed) => createSnomedFactory(snomed));
}
