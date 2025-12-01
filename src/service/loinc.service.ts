import { and, asc, count, desc, eq, type InferSelectModel, ilike, or, type SQL } from "drizzle-orm";
import db from "@/database/db";
import { loincTable } from "@/database/schemas/schema-loinc";
import { modalityTable } from "@/database/schemas/schema-modality";
import type {
    CreateLoincInput,
    LoincPaginationResponse,
    LoincQuery,
    LoincResponse,
    UpdateLoincInput,
} from "@/interface/loinc.interface";
import type { ModalityResponse } from "@/interface/modality.interface";

export class LoincService {
    static formatModalityResponse(modality: InferSelectModel<typeof modalityTable>): ModalityResponse {
        return {
            id: modality.id,
            code: modality.code,
            name: modality.name,
            description: modality.description,
            is_active: modality.is_active,
            created_at: modality.created_at.toISOString(),
            updated_at: modality.updated_at?.toISOString() ?? null,
        };
    }

    static formatLoincResponse(
        loinc: InferSelectModel<typeof loincTable>,
        modality?: InferSelectModel<typeof modalityTable>
    ): LoincResponse {
        return {
            id: loinc.id,
            id_modality: loinc.id_modality,
            modality: modality ? LoincService.formatModalityResponse(modality) : undefined,
            code: loinc.code,
            name: loinc.name,
            loinc_code: loinc.loinc_code,
            loinc_display: loinc.loinc_display,
            loinc_system: loinc.loinc_system,
            require_fasting: loinc.require_fasting,
            require_pregnancy_check: loinc.require_pregnancy_check,
            require_use_contrast: loinc.require_use_contrast,
            contrast_name: loinc.contrast_name,
            contrast_kfa_code: loinc.contrast_kfa_code,
            created_at: loinc.created_at.toISOString(),
            updated_at: loinc.updated_at?.toISOString() ?? null,
        };
    }
    static async getAllLoinc(query: LoincQuery): Promise<LoincPaginationResponse> {
        const { page, per_page, search, id_modality, sort, dir } = query;
        const offset = (page - 1) * per_page;

        // Build where conditions
        const whereConditions: SQL[] = [];

        // Search by name, code, loinc_code, loinc_display
        if (search) {
            const searchCondition = or(
                ilike(loincTable.name, `%${search}%`),
                ilike(loincTable.code, `%${search}%`),
                ilike(loincTable.loinc_code, `%${search}%`),
                ilike(loincTable.loinc_display, `%${search}%`)
            );
            if (searchCondition) {
                whereConditions.push(searchCondition);
            }
        }

        // Filter by modality
        if (id_modality) {
            whereConditions.push(eq(loincTable.id_modality, id_modality));
        }

        const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

        // Determine sort order
        const sortColumn = loincTable[sort];
        const orderBy = dir === "asc" ? asc(sortColumn) : desc(sortColumn);

        // Get loinc data with modality info
        const loincs = await db
            .select({
                loinc: loincTable,
                modality: modalityTable,
            })
            .from(loincTable)
            .leftJoin(modalityTable, eq(loincTable.id_modality, modalityTable.id))
            .where(whereClause)
            .orderBy(orderBy)
            .limit(per_page)
            .offset(offset);

        // Get total count
        const [{ total }] = await db.select({ total: count() }).from(loincTable).where(whereClause);

        const totalPages = Math.ceil(total / per_page);

        return {
            data: loincs.map(({ loinc, modality }) => LoincService.formatLoincResponse(loinc, modality ?? undefined)),
            meta: {
                total,
                page,
                per_page,
                total_pages: totalPages,
                has_next_page: page < totalPages,
                has_prev_page: page > 1,
            },
        };
    }

    static async getLoincById(loincId: string): Promise<LoincResponse | null> {
        const result = await db
            .select({
                loinc: loincTable,
                modality: modalityTable,
            })
            .from(loincTable)
            .leftJoin(modalityTable, eq(loincTable.id_modality, modalityTable.id))
            .where(eq(loincTable.id, loincId))
            .limit(1);

        if (result.length === 0) return null;

        const { loinc, modality } = result[0];
        return LoincService.formatLoincResponse(loinc, modality ?? undefined);
    }

    static async createLoinc(data: CreateLoincInput): Promise<LoincResponse> {
        const [loinc] = await db
            .insert(loincTable)
            .values({
                ...data,
            })
            .returning();

        // Get modality info
        const [modality] = await db
            .select()
            .from(modalityTable)
            .where(eq(modalityTable.id, loinc.id_modality))
            .limit(1);

        return LoincService.formatLoincResponse(loinc, modality);
    }

    static async updateLoinc(loincId: string, data: UpdateLoincInput): Promise<LoincResponse | null> {
        const updateData: Partial<InferSelectModel<typeof loincTable>> = {
            ...data,
            updated_at: new Date(),
        };

        const [loinc] = await db.update(loincTable).set(updateData).where(eq(loincTable.id, loincId)).returning();

        if (!loinc) return null;

        // Get modality info
        const [modality] = await db
            .select()
            .from(modalityTable)
            .where(eq(modalityTable.id, loinc.id_modality))
            .limit(1);

        return LoincService.formatLoincResponse(loinc, modality);
    }

    static async deleteLoinc(loincId: string): Promise<boolean> {
        const result = await db.delete(loincTable).where(eq(loincTable.id, loincId)).returning();

        return result.length > 0;
    }
}
