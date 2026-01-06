import { and, asc, count, desc, eq, type InferSelectModel, ilike, or, type SQL } from "drizzle-orm";
import db from "@/database/db";
import { practitionerTable } from "@/database/schemas/schema-practitioner";
import type {
    CreatePractitionerInput,
    PractitionerQuery,
    PractitionerResponse,
    UpdatePractitionerInput,
} from "@/interface/practitioner.interface";
import type { FilteringQueryV2, PagedList } from "@/entities/Query";
import {
    type ServiceResponse,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
} from "@/entities/Service";
import { SatuSehatService } from "@/service/satu-sehat.service";
import { loggerPino } from "@/config/log";

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

    static async getAllPractitioners(query: PractitionerQuery): Promise<ServiceResponse<PagedList<PractitionerResponse[]>>> {
        try {
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
                status: true,
                data: {
                    entries: practitioners.map((practitioner) => PractitionerService.formatPractitionerResponse(practitioner)),
                    totalData: total,
                    totalPage: totalPages,
                },
            };
        } catch (err) {
            console.error(`PractitionerService.getAllPractitioners: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async getPractitionerById(practitionerId: string): Promise<ServiceResponse<PractitionerResponse>> {
        try {
            const [practitioner] = await db
                .select()
                .from(practitionerTable)
                .where(eq(practitionerTable.id, practitionerId))
                .limit(1);

            if (!practitioner) return INVALID_ID_SERVICE_RESPONSE;

            return {
                status: true,
                data: PractitionerService.formatPractitionerResponse(practitioner),
            };
        } catch (err) {
            console.error(`PractitionerService.getPractitionerById: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async createPractitioner(data: CreatePractitionerInput): Promise<ServiceResponse<PractitionerResponse>> {
        try {
            const [practitioner] = await db
                .insert(practitionerTable)
                .values({
                    ...data,
                    birth_date: new Date(data.birth_date),
                    ihs_last_sync: data.ihs_last_sync ? new Date(data.ihs_last_sync) : null,
                })
                .returning();

            return {
                status: true,
                data: PractitionerService.formatPractitionerResponse(practitioner),
            };
        } catch (err) {
            console.error(`PractitionerService.createPractitioner: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async updatePractitioner(
        practitionerId: string,
        data: UpdatePractitionerInput
    ): Promise<ServiceResponse<PractitionerResponse>> {
        try {
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

            if (!practitioner) return INVALID_ID_SERVICE_RESPONSE;

            return {
                status: true,
                data: PractitionerService.formatPractitionerResponse(practitioner),
            };
        } catch (err) {
            console.error(`PractitionerService.updatePractitioner: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async deletePractitioner(practitionerId: string): Promise<ServiceResponse<{ deletedCount: number }>> {
        try {
            const result = await db.delete(practitionerTable).where(eq(practitionerTable.id, practitionerId)).returning();

            if (result.length === 0) return INVALID_ID_SERVICE_RESPONSE;

            return {
                status: true,
                data: { deletedCount: result.length },
            };
        } catch (err) {
            console.error(`PractitionerService.deletePractitioner: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    /**
     * Sync practitioner to Satu Sehat by NIK
     * This will fetch IHS number from Satu Sehat and update the practitioner
     */
    static async syncToSatuSehat(practitionerId: string): Promise<{
        success: boolean;
        message: string;
        data?: {
            practitioner_id: string;
            ihs_number: string;
            name: string;
            synced_at: string;
        };
    }> {
        try {
            // 1. Get practitioner
            const [practitioner] = await db
                .select()
                .from(practitionerTable)
                .where(eq(practitionerTable.id, practitionerId))
                .limit(1);

            if (!practitioner) {
                return {
                    success: false,
                    message: "Practitioner not found",
                };
            }

            // 2. Validate NIK exists
            if (!practitioner.nik) {
                return {
                    success: false,
                    message: "Practitioner does not have NIK. NIK is required to sync with Satu Sehat.",
                };
            }

            // 2a. Check if already has IHS number
            if (practitioner.ihs_number) {
                loggerPino.info(`[Practitioner Sync] Practitioner ${practitioner.name} already has IHS number: ${practitioner.ihs_number}`);
                return {
                    success: true,
                    message: "Practitioner already has IHS number (already synced)",
                    data: {
                        practitioner_id: practitioner.id,
                        ihs_number: practitioner.ihs_number,
                        name: practitioner.name,
                        synced_at: practitioner.ihs_last_sync?.toISOString() || new Date().toISOString(),
                    },
                };
            }

            // 3. Get IHS number from Satu Sehat
            loggerPino.info(`[Practitioner Sync] Fetching IHS number for NIK: ${practitioner.nik}`);
            const satuSehatResponse = await SatuSehatService.getIHSPractitionerByNIK(practitioner.nik);

            if (!satuSehatResponse.status || !satuSehatResponse.data) {
                return {
                    success: false,
                    message: satuSehatResponse.err?.message || "Failed to fetch practitioner from Satu Sehat",
                };
            }

            // 4. Extract IHS number
            const bundle = satuSehatResponse.data;
            if (!bundle.entry || bundle.entry.length === 0) {
                return {
                    success: false,
                    message: `No practitioner found in Satu Sehat with NIK: ${practitioner.nik}`,
                };
            }

            const ihsNumber = bundle.entry[0].resource.id;
            if (!ihsNumber) {
                return {
                    success: false,
                    message: "Failed to extract IHS number from Satu Sehat response",
                };
            }

            // 4a. Check if IHS number already exists in another practitioner
            const existingPractitioner = await db
                .select()
                .from(practitionerTable)
                .where(eq(practitionerTable.ihs_number, ihsNumber))
                .limit(1);

            if (existingPractitioner.length > 0 && existingPractitioner[0].id !== practitionerId) {
                loggerPino.warn(
                    `[Practitioner Sync] IHS number ${ihsNumber} already exists for practitioner: ${existingPractitioner[0].name} (${existingPractitioner[0].id})`
                );
                return {
                    success: false,
                    message: `IHS number ${ihsNumber} sudah terdaftar ke practitioner lain: ${existingPractitioner[0].name}. Periksa data NIK di Satu Sehat.`,
                };
            }

            // 5. Update practitioner with IHS number
            const syncedAt = new Date();
            
            loggerPino.info(`[Practitioner Sync] Updating practitioner ${practitioner.name} with IHS: ${ihsNumber}`);
            
            try {
                await db
                    .update(practitionerTable)
                    .set({
                        ihs_number: ihsNumber,
                        ihs_last_sync: syncedAt,
                        ihs_response_status: "OK", // Max 3 chars as per schema
                        updated_at: syncedAt,
                    })
                    .where(eq(practitionerTable.id, practitionerId));

                loggerPino.info(`[Practitioner Sync] Successfully synced practitioner ${practitioner.name} with IHS number: ${ihsNumber}`);
            } catch (dbError) {
                // Check if it's a unique constraint violation
                const errorMsg = dbError instanceof Error ? dbError.message : String(dbError);
                loggerPino.error(`[Practitioner Sync] Database error: ${errorMsg}`);
                
                if (errorMsg.includes("unique") || errorMsg.includes("duplicate") || errorMsg.includes("constraint")) {
                    return {
                        success: false,
                        message: `IHS number ${ihsNumber} sudah terdaftar ke practitioner lain. Periksa data di Satu Sehat atau database.`,
                    };
                }
                
                // Return error message instead of throwing
                return {
                    success: false,
                    message: `Database error: ${errorMsg}`,
                };
            }

            return {
                success: true,
                message: "Practitioner synced to Satu Sehat successfully",
                data: {
                    practitioner_id: practitioner.id,
                    ihs_number: ihsNumber,
                    name: practitioner.name,
                    synced_at: syncedAt.toISOString(),
                },
            };
        } catch (error) {
            loggerPino.error(`[Practitioner Sync] Error: ${error}`);
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to sync practitioner to Satu Sehat",
            };
        }
    }
}
