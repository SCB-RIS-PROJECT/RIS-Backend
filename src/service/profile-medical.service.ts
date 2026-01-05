import { and, asc, count, desc, eq, type InferSelectModel, ilike, or, type SQL } from "drizzle-orm";
import db from "@/database/db";
import { profileTable } from "@/database/schemas/schema-profile-medical";
import type {
    CreateProfileInput,
    ProfileQuery,
    ProfileResponse,
    UpdateProfileInput,
} from "@/interface/profile-medical.interface";
import type { FilteringQueryV2, PagedList } from "@/entities/Query";
import {
    type ServiceResponse,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
} from "@/entities/Service";

export class ProfileService {
    static formatProfileResponse(profile: InferSelectModel<typeof profileTable>): ProfileResponse {
        return {
            id: profile.id,
            ihs_number: profile.ihs_number,
            ihs_last_sync: profile.ihs_last_sync?.toISOString() || null,
            ihs_response_status: profile.ihs_response_status,
            profession: profile.profession,
            nik: profile.nik,
            name: profile.name,
            gender: profile.gender,
            birth_date: profile.birth_date.toISOString(),
            phone: profile.phone,
            email: profile.email,
            address: profile.address,
            id_province: profile.id_province,
            province: profile.province,
            id_city: profile.id_city,
            city: profile.city,
            id_district: profile.id_district,
            district: profile.district,
            id_sub_district: profile.id_sub_district,
            sub_district: profile.sub_district,
            rt: profile.rt,
            rw: profile.rw,
            postal_code: profile.postal_code,
            active: profile.active,
            created_at: profile.created_at.toISOString(),
            updated_at: profile.updated_at?.toISOString() || null,
        };
    }

    static async getAllProfiles(query: ProfileQuery): Promise<ServiceResponse<PagedList<ProfileResponse[]>>> {
        try {
            const { page, per_page, search, profession, active, sort, dir } = query;
            const offset = (page - 1) * per_page;

            // Build where conditions
            const whereConditions: SQL[] = [];

            if (search) {
                const searchCondition = or(
                    ilike(profileTable.name, `%${search}%`),
                    ilike(profileTable.nik, `%${search}%`),
                    ilike(profileTable.phone, `%${search}%`),
                    ilike(profileTable.email, `%${search}%`)
                );
                if (searchCondition) {
                    whereConditions.push(searchCondition);
                }
            }

            if (profession) {
                whereConditions.push(eq(profileTable.profession, profession));
            }

            if (active !== undefined) {
                whereConditions.push(eq(profileTable.active, active));
            }

            const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

            // Determine sort order
            const sortColumn = profileTable[sort];
            const orderBy = dir === "asc" ? asc(sortColumn) : desc(sortColumn);

            // Get profiles
            const profiles = await db
                .select()
                .from(profileTable)
                .where(whereClause)
                .orderBy(orderBy)
                .limit(per_page)
                .offset(offset);

            // Get total count
            const [{ total }] = await db.select({ total: count() }).from(profileTable).where(whereClause);

            const totalPages = Math.ceil(total / per_page);

            return {
                status: true,
                data: {
                    entries: profiles.map((profile) => ProfileService.formatProfileResponse(profile)),
                    totalData: total,
                    totalPage: totalPages,
                },
            };
        } catch (err) {
            console.error(`ProfileService.getAllProfiles: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async getProfileById(profileId: string): Promise<ServiceResponse<ProfileResponse>> {
        try {
            const [profile] = await db
                .select()
                .from(profileTable)
                .where(eq(profileTable.id, profileId))
                .limit(1);

            if (!profile) return INVALID_ID_SERVICE_RESPONSE;

            return {
                status: true,
                data: ProfileService.formatProfileResponse(profile),
            };
        } catch (err) {
            console.error(`ProfileService.getProfileById: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async createProfile(data: CreateProfileInput): Promise<ServiceResponse<ProfileResponse>> {
        try {
            const [profile] = await db
                .insert(profileTable)
                .values({
                    ...data,
                    birth_date: new Date(data.birth_date),
                    ihs_last_sync: data.ihs_last_sync ? new Date(data.ihs_last_sync) : null,
                })
                .returning();

            return {
                status: true,
                data: ProfileService.formatProfileResponse(profile),
            };
        } catch (err) {
            console.error(`ProfileService.createProfile: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async updateProfile(
        profileId: string,
        data: UpdateProfileInput
    ): Promise<ServiceResponse<ProfileResponse>> {
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

            const [profile] = await db
                .update(profileTable)
                .set(updateData)
                .where(eq(profileTable.id, profileId))
                .returning();

            if (!profile) return INVALID_ID_SERVICE_RESPONSE;

            return {
                status: true,
                data: ProfileService.formatProfileResponse(profile),
            };
        } catch (err) {
            console.error(`ProfileService.updateProfile: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async deleteProfile(profileId: string): Promise<ServiceResponse<{ deletedCount: number }>> {
        try {
            const result = await db.delete(profileTable).where(eq(profileTable.id, profileId)).returning();

            if (result.length === 0) return INVALID_ID_SERVICE_RESPONSE;

            return {
                status: true,
                data: { deletedCount: result.length },
            };
        } catch (err) {
            console.error(`ProfileService.deleteProfile: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }
}
