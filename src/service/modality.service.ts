import { and, asc, count, desc, eq, type InferSelectModel, ilike, or, type SQL } from "drizzle-orm";
import db from "@/database/db";
import { modalityTable } from "@/database/schemas/schema-modality";
import type {
    CreateModalityInput,
    ModalityPaginationResponse,
    ModalityQuery,
    ModalityResponse,
    UpdateModalityInput,
} from "@/interface/modality.interface";

export class ModalityService {
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

    static async getAllModalities(query: ModalityQuery): Promise<ModalityPaginationResponse> {
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
            data: modalities.map((modality) => ModalityService.formatModalityResponse(modality)),
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

    static async getModalityById(modalityId: string): Promise<ModalityResponse | null> {
        const [modality] = await db.select().from(modalityTable).where(eq(modalityTable.id, modalityId)).limit(1);

        if (!modality) return null;

        return ModalityService.formatModalityResponse(modality);
    }

    static async createModality(data: CreateModalityInput): Promise<ModalityResponse> {
        const [modality] = await db
            .insert(modalityTable)
            .values({
                ...data,
            })
            .returning();

        return ModalityService.formatModalityResponse(modality);
    }

    static async updateModality(modalityId: string, data: UpdateModalityInput): Promise<ModalityResponse | null> {
        const updateData: Partial<InferSelectModel<typeof modalityTable>> = {
            ...data,
            updated_at: new Date(),
        };

        const [modality] = await db
            .update(modalityTable)
            .set(updateData)
            .where(eq(modalityTable.id, modalityId))
            .returning();

        if (!modality) return null;

        return ModalityService.formatModalityResponse(modality);
    }

    static async deleteModality(modalityId: string): Promise<boolean> {
        const result = await db.delete(modalityTable).where(eq(modalityTable.id, modalityId)).returning();

        return result.length > 0;
    }
}
