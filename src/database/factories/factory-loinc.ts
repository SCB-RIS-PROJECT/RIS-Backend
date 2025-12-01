import type { InferInsertModel } from "drizzle-orm";
import { eq } from "drizzle-orm";
import db from "@/database/db";
import { loincTable } from "@/database/schemas/schema-loinc";
import { modalityTable } from "@/database/schemas/schema-modality";

type LoincInsert = InferInsertModel<typeof loincTable>;

/**
 * Get modality ID by code
 */
export async function getModalityIdByCode(code: string): Promise<string> {
    const [modality] = await db.select().from(modalityTable).where(eq(modalityTable.code, code)).limit(1);

    if (!modality) {
        throw new Error(`Modality with code ${code} not found`);
    }

    return modality.id;
}

/**
 * Create a single LOINC record
 */
export async function createLoinc(data: LoincInsert) {
    const [loinc] = await db.insert(loincTable).values(data).returning();
    return loinc;
}

/**
 * Create multiple LOINC records
 */
export async function createManyLoinc(data: LoincInsert[]) {
    const loincs = await db.insert(loincTable).values(data).returning();
    return loincs;
}
