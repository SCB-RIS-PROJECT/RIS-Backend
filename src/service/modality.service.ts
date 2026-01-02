import { and, asc, count, desc, eq, type InferSelectModel, ilike, or, type SQL } from "drizzle-orm";
import db from "@/database/db";
import { modalityTable } from "@/database/schemas/schema-modality";
import type {
    CreateModalityInput,
    ModalityQuery,
    ModalityResponse,
    UpdateModalityInput,
} from "@/interface/modality.interface";
import type { PagedList } from "@/entities/Query";
import {
    type ServiceResponse,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
} from "@/entities/Service";

export class ModalityService {
    static formatModalityResponse(modality: InferSelectModel<typeof modalityTable>): ModalityResponse {
        return {
            id: modality.id,
            code: modality.code,
            name: modality.name,
            aet: modality.aet ?? null,
            description: modality.description,
            is_active: modality.is_active,
            created_at: modality.created_at.toISOString(),
            updated_at: modality.updated_at?.toISOString() ?? null,
        };
    }

    static async getAllModalities(query: ModalityQuery): Promise<ServiceResponse<PagedList<ModalityResponse[]>>> {
        try {
            const { page, per_page, search, sort, dir } = query;
            const offset = (page - 1) * per_page;

            // Build where conditions
            const whereConditions: SQL[] = [];
            if (search) {
                const searchCondition = or(
                    ilike(modalityTable.code, `%${search}%`),
                    ilike(modalityTable.name, `%${search}%`)
                );
                if (searchCondition) {
                    whereConditions.push(searchCondition);
                }
            }

            const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

            // Determine sort order
            const sortColumn = modalityTable[sort];
            const orderBy = dir === "asc" ? asc(sortColumn) : desc(sortColumn);

            // Get modalities
            const modalities = await db
                .select()
                .from(modalityTable)
                .where(whereClause)
                .orderBy(orderBy)
                .limit(per_page)
                .offset(offset);

            // Get total count
            const [{ total }] = await db.select({ total: count() }).from(modalityTable).where(whereClause);

            const totalPages = Math.ceil(total / per_page);

            return {
                status: true,
                data: {
                    entries: modalities.map((modality) => ModalityService.formatModalityResponse(modality)),
                    totalData: total,
                    totalPage: totalPages,
                },
            };
        } catch (err) {
            console.error(`ModalityService.getAllModalities: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async getModalityById(modalityId: string): Promise<ServiceResponse<ModalityResponse>> {
        try {
            const [modality] = await db.select().from(modalityTable).where(eq(modalityTable.id, modalityId)).limit(1);

            if (!modality) return INVALID_ID_SERVICE_RESPONSE;

            return {
                status: true,
                data: ModalityService.formatModalityResponse(modality),
            };
        } catch (err) {
            console.error(`ModalityService.getModalityById: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async createModality(data: CreateModalityInput): Promise<ServiceResponse<ModalityResponse>> {
        try {
            const [modality] = await db
                .insert(modalityTable)
                .values({
                    ...data,
                })
                .returning();

            return {
                status: true,
                data: ModalityService.formatModalityResponse(modality),
            };
        } catch (err) {
            console.error(`ModalityService.createModality: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async updateModality(modalityId: string, data: UpdateModalityInput): Promise<ServiceResponse<ModalityResponse>> {
        try {
            const updateData: Partial<InferSelectModel<typeof modalityTable>> = {
                ...data,
                updated_at: new Date(),
            };

            const [modality] = await db
                .update(modalityTable)
                .set(updateData)
                .where(eq(modalityTable.id, modalityId))
                .returning();

            if (!modality) return INVALID_ID_SERVICE_RESPONSE;

            return {
                status: true,
                data: ModalityService.formatModalityResponse(modality),
            };
        } catch (err) {
            console.error(`ModalityService.updateModality: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async deleteModality(modalityId: string): Promise<ServiceResponse<{ deletedCount: number }>> {
        try {
            const result = await db.delete(modalityTable).where(eq(modalityTable.id, modalityId)).returning();

            if (result.length === 0) return INVALID_ID_SERVICE_RESPONSE;

            return {
                status: true,
                data: { deletedCount: result.length },
            };
        } catch (err) {
            console.error(`ModalityService.deleteModality: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }
}
