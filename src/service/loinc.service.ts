import { and, asc, count, desc, eq, type InferSelectModel, ilike, or, type SQL } from "drizzle-orm";
import db from "@/database/db";
import { loincTable } from "@/database/schemas/schema-loinc";
import { modalityTable } from "@/database/schemas/schema-modality";
import type {
    CreateLoincInput,
    LoincQuery,
    LoincResponse,
    UpdateLoincInput,
} from "@/interface/loinc.interface";
import type { ModalityResponse } from "@/interface/modality.interface";
import type { FilteringQueryV2, PagedList } from "@/entities/Query";
import {
    type ServiceResponse,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
} from "@/entities/Service";

export class LoincService {
    static formatModalityResponse(modality: InferSelectModel<typeof modalityTable>): ModalityResponse {
        return {
            id: modality.id,
            code: modality.code,
            name: modality.name,
            aet: modality.aet,
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
    static async getAllLoinc(query: LoincQuery): Promise<ServiceResponse<PagedList<LoincResponse[]>>> {
        try {
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
                status: true,
                data: {
                    entries: loincs.map(({ loinc, modality }) => LoincService.formatLoincResponse(loinc, modality ?? undefined)),
                    totalData: total,
                    totalPage: totalPages,
                },
            };
        } catch (err) {
            console.error(`LoincService.getAllLoinc: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async getLoincById(loincId: string): Promise<ServiceResponse<LoincResponse>> {
        try {
            const result = await db
                .select({
                    loinc: loincTable,
                    modality: modalityTable,
                })
                .from(loincTable)
                .leftJoin(modalityTable, eq(loincTable.id_modality, modalityTable.id))
                .where(eq(loincTable.id, loincId))
                .limit(1);

            if (result.length === 0) return INVALID_ID_SERVICE_RESPONSE;

            const { loinc, modality } = result[0];
            return {
                status: true,
                data: LoincService.formatLoincResponse(loinc, modality ?? undefined),
            };
        } catch (err) {
            console.error(`LoincService.getLoincById: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async createLoinc(data: CreateLoincInput): Promise<ServiceResponse<LoincResponse>> {
        try {
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

            return {
                status: true,
                data: LoincService.formatLoincResponse(loinc, modality),
            };
        } catch (err) {
            console.error(`LoincService.createLoinc: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async updateLoinc(loincId: string, data: UpdateLoincInput): Promise<ServiceResponse<LoincResponse>> {
        try {
            const updateData: Partial<InferSelectModel<typeof loincTable>> = {
                ...data,
                updated_at: new Date(),
            };

            const [loinc] = await db.update(loincTable).set(updateData).where(eq(loincTable.id, loincId)).returning();

            if (!loinc) return INVALID_ID_SERVICE_RESPONSE;

            // Get modality info
            const [modality] = await db
                .select()
                .from(modalityTable)
                .where(eq(modalityTable.id, loinc.id_modality))
                .limit(1);

            return {
                status: true,
                data: LoincService.formatLoincResponse(loinc, modality),
            };
        } catch (err) {
            console.error(`LoincService.updateLoinc: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async deleteLoinc(loincId: string): Promise<ServiceResponse<{ deletedCount: number }>> {
        try {
            const result = await db.delete(loincTable).where(eq(loincTable.id, loincId)).returning();

            if (result.length === 0) return INVALID_ID_SERVICE_RESPONSE;

            return {
                status: true,
                data: { deletedCount: result.length },
            };
        } catch (err) {
            console.error(`LoincService.deleteLoinc: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }
}
