// biome-ignore-all lint/correctness/noUnusedPrivateClassMembers: <because service>

import env from "@/config/env";
import type {
    FHIREncounter,
    FHIREncounterResponse,
    IHSPatientBundle,
    IHSPractitionerBundle,
    SatuSehatTokenResponse,
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
     * Post Encounter to Satu Sehat API
     */
    static async postEncounter(encounterData: FHIREncounter): Promise<FHIREncounterResponse> {
        const token = await SatuSehatService.getAccessToken();

        const url = `${env.SATU_SEHAT_BASE_URL}/Encounter`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(encounterData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to post Encounter: ${response.statusText} - ${errorText}`);
        }

        const data = (await response.json()) as FHIREncounterResponse;
        return data;
    }
}
