import { and, asc, count, desc, eq, type InferSelectModel, ilike, or, type SQL } from "drizzle-orm";
import db from "@/database/db";
import { practitionerTable } from "@/database/schemas/schema-practitioner";
import type {
    CreatePractitionerInput,
    PractitionerPaginationResponse,
    PractitionerQuery,
    PractitionerResponse,
    UpdatePractitionerInput,
} from "@/interface/practitioner.interface";

export class PractitionerService {
    static formatPractitionerResponse(practitioner: InferSelectModel<typeof practitionerTable>): PractitionerResponse {
        return {
            id: practitioner.id,
            ihs_number: practitioner.ihs_number,
            ihs_last_sync: practitioner.ihs_last_sync?.toISOString() || null,
            ihs_response_status: practitioner.ihs_response_status,
            profession: practitioner.profession,
            nik: practitioner.nik,
            name: practitioner.name,
            gender: practitioner.gender,
            birth_date: practitioner.birth_date.toISOString(),
            phone: practitioner.phone,
            email: practitioner.email,
            address: practitioner.address,
            id_province: practitioner.id_province,
            province: practitioner.province,
            id_city: practitioner.id_city,
            city: practitioner.city,
            id_district: practitioner.id_district,
            district: practitioner.district,
            id_sub_district: practitioner.id_sub_district,
            sub_district: practitioner.sub_district,
            rt: practitioner.rt,
            rw: practitioner.rw,
            postal_code: practitioner.postal_code,
            active: practitioner.active,
            created_at: practitioner.created_at.toISOString(),
            updated_at: practitioner.updated_at?.toISOString() || null,
        };
    }

    static async getAllPractitioners(query: PractitionerQuery): Promise<PractitionerPaginationResponse> {
        const { page, per_page, search, profession, active, sort, dir } = query;
        const offset = (page - 1) * per_page;

        // Build where conditions
        const whereConditions: SQL[] = [];

        if (search) {
            const searchCondition = or(
                ilike(practitionerTable.name, `%${search}%`),
                ilike(practitionerTable.nik, `%${search}%`),
                ilike(practitionerTable.phone, `%${search}%`),
                ilike(practitionerTable.email, `%${search}%`)
            );
            if (searchCondition) {
                whereConditions.push(searchCondition);
            }
        }

        if (profession) {
            whereConditions.push(eq(practitionerTable.profession, profession));
        }

        if (active !== undefined) {
            whereConditions.push(eq(practitionerTable.active, active));
        }

        const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

        // Determine sort order
        const sortColumn = practitionerTable[sort];
        const orderBy = dir === "asc" ? asc(sortColumn) : desc(sortColumn);

        // Get practitioners
        const practitioners = await db
            .select()
            .from(practitionerTable)
            .where(whereClause)
            .orderBy(orderBy)
            .limit(per_page)
            .offset(offset);

        // Get total count
        const [{ total }] = await db.select({ total: count() }).from(practitionerTable).where(whereClause);

        const totalPages = Math.ceil(total / per_page);

        return {
            data: practitioners.map((practitioner) => PractitionerService.formatPractitionerResponse(practitioner)),
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

    static async getPractitionerById(practitionerId: string): Promise<PractitionerResponse | null> {
        const [practitioner] = await db
            .select()
            .from(practitionerTable)
            .where(eq(practitionerTable.id, practitionerId))
            .limit(1);

        if (!practitioner) return null;

        return PractitionerService.formatPractitionerResponse(practitioner);
    }

    static async createPractitioner(data: CreatePractitionerInput): Promise<PractitionerResponse> {
        const [practitioner] = await db
            .insert(practitionerTable)
            .values({
                ...data,
                birth_date: new Date(data.birth_date),
                ihs_last_sync: data.ihs_last_sync ? new Date(data.ihs_last_sync) : null,
            })
            .returning();

        return PractitionerService.formatPractitionerResponse(practitioner);
    }

    static async updatePractitioner(
        practitionerId: string,
        data: UpdatePractitionerInput
    ): Promise<PractitionerResponse | null> {
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle typing issue with partial updates
        const updateData: any = {
            ...data,
            updated_at: new Date(),
        };

        if (data.birth_date) {
            updateData.birth_date = new Date(data.birth_date);
        }

        if (data.ihs_last_sync) {
            updateData.ihs_last_sync = new Date(data.ihs_last_sync);
        }

        const [practitioner] = await db
            .update(practitionerTable)
            .set(updateData)
            .where(eq(practitionerTable.id, practitionerId))
            .returning();

        if (!practitioner) return null;

        return PractitionerService.formatPractitionerResponse(practitioner);
    }

    static async deletePractitioner(practitionerId: string): Promise<boolean> {
        const result = await db.delete(practitionerTable).where(eq(practitionerTable.id, practitionerId)).returning();

        return result.length > 0;
    }
}
