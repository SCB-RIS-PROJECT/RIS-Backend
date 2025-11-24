// biome-ignore-all lint/correctness/noUnusedPrivateClassMembers: <because service>

import { and, count, type InferSelectModel, ilike, or, type SQL } from "drizzle-orm";
import env from "@/config/env";
import db from "@/database/db";
import { snomedTable } from "@/database/schemas/schema-snomed";
import type {
    IHSPatientBundle,
    IHSPractitionerBundle,
    SatuSehatTokenResponse,
    SnomedPaginationResponse,
    SnomedQuery,
    SnomedResponse,
} from "@/interface/satu-sehat.interface";

export class SatuSehatService {
    private static tokenCache: {
        token: string | null;
        expiresAt: number;
    } = {
        token: null,
        expiresAt: 0,
    };

    /**
     * Get access token from Satu Sehat API
     * Token is cached for 1 hour to avoid unnecessary requests
     */
    static async getAccessToken(): Promise<string> {
        // Check if we have a valid cached token
        const now = Date.now();
        if (SatuSehatService.tokenCache.token && SatuSehatService.tokenCache.expiresAt > now) {
            return SatuSehatService.tokenCache.token;
        }

        // Request new token
        const url = `${env.SATU_SEHAT_AUTH_URL}/accesstoken?grant_type=client_credentials`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: env.SATU_SEHAT_CLIENT_ID,
                client_secret: env.SATU_SEHAT_CLIENT_SECRET,
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to get access token: ${response.statusText}`);
        }

        const data = (await response.json()) as SatuSehatTokenResponse;

        // Cache token (subtract 60 seconds as buffer)
        SatuSehatService.tokenCache.token = data.access_token;
        SatuSehatService.tokenCache.expiresAt = now + (Number.parseInt(data.expires_in, 10) - 60) * 1000;

        return data.access_token;
    }

    /**
     * Get IHS Patient by NIK from Satu Sehat API
     */
    static async getIHSPatientByNIK(nik: string): Promise<IHSPatientBundle> {
        const token = await SatuSehatService.getAccessToken();

        const url = `${env.SATU_SEHAT_BASE_URL}/Patient?identifier=https://fhir.kemkes.go.id/id/nik|${nik}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to get IHS Patient: ${response.statusText}`);
        }

        const data = (await response.json()) as IHSPatientBundle;
        return data;
    }

    /**
     * Get IHS Practitioner by NIK from Satu Sehat API
     */
    static async getIHSPractitionerByNIK(nik: string): Promise<IHSPractitionerBundle> {
        const token = await SatuSehatService.getAccessToken();

        const url = `${env.SATU_SEHAT_BASE_URL}/Practitioner?identifier=https://fhir.kemkes.go.id/id/nik|${nik}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to get IHS Practitioner: ${response.statusText}`);
        }

        const data = (await response.json()) as IHSPractitionerBundle;
        return data;
    }

    /**
     * Format SNOMED response
     */
    static formatSnomedResponse(snomed: InferSelectModel<typeof snomedTable>): SnomedResponse {
        return {
            id: snomed.id,
            code: snomed.code,
            display: snomed.display,
            system: snomed.system,
            category: snomed.category,
            description: snomed.description,
            active: snomed.active,
            created_at: snomed.created_at.toISOString(),
            updated_at: snomed.updated_at?.toISOString() ?? null,
        };
    }

    /**
     * Get SNOMED-CT codes from database with pagination
     */
    static async getSnomedFromDatabase(query: SnomedQuery): Promise<SnomedPaginationResponse> {
        const { page, per_page, search } = query;
        const offset = (page - 1) * per_page;

        // Build where conditions
        const whereConditions: SQL[] = [];
        if (search) {
            const searchCondition = or(
                ilike(snomedTable.code, `%${search}%`),
                ilike(snomedTable.display, `%${search}%`),
                ilike(snomedTable.description, `%${search}%`),
                ilike(snomedTable.category, `%${search}%`)
            );
            if (searchCondition) {
                whereConditions.push(searchCondition);
            }
        }

        const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

        // Get SNOMED codes
        const snomeds = await db.select().from(snomedTable).where(whereClause).limit(per_page).offset(offset);

        // Get total count
        const [{ total }] = await db.select({ total: count() }).from(snomedTable).where(whereClause);

        const totalPages = Math.ceil(total / per_page);

        return {
            data: snomeds.map((snomed) => SatuSehatService.formatSnomedResponse(snomed)),
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
}
