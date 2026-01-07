/**
 * PACS Orthanc Library
 * Untuk retrieve studies dari PACS Orthanc berdasarkan Accession Number
 */

import env from "@/config/env";

const PACS_ORTHANC_URL = env.PACS_ORTHANC_URL ?? "http://192.168.251.202";
const PACS_ORTHANC_HTTP_PORT = env.PACS_ORTHANC_HTTP_PORT ?? 8042;
const PACS_ORTHANC_USERNAME = env.PACS_ORTHANC_USERNAME ?? "rsba";
const PACS_ORTHANC_PASSWORD = env.PACS_ORTHANC_PASSWORD ?? "rsba";
const PACS_ORTHANC_BASE_URL = `${PACS_ORTHANC_URL}:${PACS_ORTHANC_HTTP_PORT}`;
const PACS_ORTHANC_AUTH_HEADER = "Basic " + btoa(`${PACS_ORTHANC_USERNAME}:${PACS_ORTHANC_PASSWORD}`);

export interface PACSStudyQueryParams {
    accessionNumber?: string;
    patientId?: string;
    studyInstanceUID?: string;
    studyDate?: string;
    modality?: string;
    patientName?: string;
}

export interface PACSStudyResult {
    studyId: string;
    studyInstanceUID: string;
    accessionNumber: string;
    patientId: string;
    patientName: string;
    studyDate: string;
    studyDescription: string;
    modalities: string;
    numberOfSeries: number;
    numberOfInstances: number;
    studyUrl: string;
    viewerUrl: string;
}

/**
 * Query studies dari PACS Orthanc
 */
export async function queryStudiesFromPACS(params: PACSStudyQueryParams): Promise<{
    success: boolean;
    data?: PACSStudyResult[];
    error?: string;
}> {
    try {
        const query: any = {};

        if (params.accessionNumber) query.AccessionNumber = params.accessionNumber;
        if (params.patientId) query.PatientID = params.patientId;
        if (params.studyInstanceUID) query.StudyInstanceUID = params.studyInstanceUID;
        if (params.studyDate) query.StudyDate = params.studyDate;
        if (params.modality) query.ModalitiesInStudy = params.modality;
        if (params.patientName) query.PatientName = params.patientName;

        console.log("[PACS] Querying studies with params:", query);

        const response = await fetch(`${PACS_ORTHANC_BASE_URL}/tools/find`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: PACS_ORTHANC_AUTH_HEADER,
            },
            body: JSON.stringify({
                Level: "Study",
                Query: query,
                Expand: true,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[PACS] Query error:", response.status, errorText);
            return {
                success: false,
                error: `PACS Orthanc query error: ${response.status} - ${errorText}`,
            };
        }

        const results = await response.json();
        console.log("[PACS] Found", results.length, "studies");

        // Transform results ke format yang lebih readable
        const studies: PACSStudyResult[] = results.map((study: any) => {
            const studyId = study.ID;
            const mainTags = study.MainDicomTags || {};
            const patientTags = study.PatientMainDicomTags || {};

            return {
                studyId: studyId,
                studyInstanceUID: mainTags.StudyInstanceUID || "",
                accessionNumber: mainTags.AccessionNumber || "",
                patientId: patientTags.PatientID || "",
                patientName: patientTags.PatientName || "",
                studyDate: mainTags.StudyDate || "",
                studyDescription: mainTags.StudyDescription || "",
                modalities: mainTags.ModalitiesInStudy || "",
                numberOfSeries: study.Series?.length || 0,
                numberOfInstances: study.Instances?.length || 0,
                studyUrl: `${PACS_ORTHANC_BASE_URL}/studies/${studyId}`,
                viewerUrl: `${PACS_ORTHANC_BASE_URL}/app/explorer.html#study?uuid=${studyId}`,
            };
        });

        return {
            success: true,
            data: studies,
        };
    } catch (error) {
        console.error("[PACS] Query exception:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get study detail dari PACS Orthanc by Study ID
 */
export async function getStudyDetailFromPACS(studyId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
}> {
    try {
        console.log("[PACS] Getting study detail for:", studyId);

        const response = await fetch(`${PACS_ORTHANC_BASE_URL}/studies/${studyId}`, {
            method: "GET",
            headers: {
                Authorization: PACS_ORTHANC_AUTH_HEADER,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[PACS] Get study error:", response.status, errorText);
            return {
                success: false,
                error: `PACS Orthanc get study error: ${response.status} - ${errorText}`,
            };
        }

        const data = await response.json();
        console.log("[PACS] Study detail retrieved successfully");

        return {
            success: true,
            data: data,
        };
    } catch (error) {
        console.error("[PACS] Get study exception:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get detailed study with all series and instances (for Cornerstone viewer)
 */
export async function getStudyWithSeriesAndInstances(studyId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
}> {
    try {
        // Get study detail
        const studyResponse = await fetch(`${PACS_ORTHANC_BASE_URL}/studies/${studyId}`, {
            method: "GET",
            headers: {
                Authorization: PACS_ORTHANC_AUTH_HEADER,
            },
        });

        if (!studyResponse.ok) {
            return { success: false, error: "Failed to get study" };
        }

        const study = await studyResponse.json();
        const studyInstanceUID = study.MainDicomTags?.StudyInstanceUID;
        const patientTags = study.PatientMainDicomTags || {};

        // Get all series with instances
        const series = await Promise.all(
            (study.Series || []).map(async (seriesId: string) => {
                const seriesResponse = await fetch(`${PACS_ORTHANC_BASE_URL}/series/${seriesId}`, {
                    method: "GET",
                    headers: {
                        Authorization: PACS_ORTHANC_AUTH_HEADER,
                    },
                });

                if (!seriesResponse.ok) return null;

                const seriesData = await seriesResponse.json();
                const seriesInstanceUID = seriesData.MainDicomTags?.SeriesInstanceUID;

                // Get all instances in this series
                const instances = await Promise.all(
                    (seriesData.Instances || []).map(async (instanceId: string) => {
                        const instanceResponse = await fetch(`${PACS_ORTHANC_BASE_URL}/instances/${instanceId}`, {
                            method: "GET",
                            headers: {
                                Authorization: PACS_ORTHANC_AUTH_HEADER,
                            },
                        });

                        if (!instanceResponse.ok) return null;

                        const instanceData = await instanceResponse.json();
                        return {
                            sopInstanceUID: instanceData.MainDicomTags?.SOPInstanceUID,
                            instanceNumber: instanceData.MainDicomTags?.InstanceNumber,
                        };
                    })
                );

                return {
                    seriesInstanceUID: seriesInstanceUID,
                    seriesNumber: seriesData.MainDicomTags?.SeriesNumber,
                    seriesDescription: seriesData.MainDicomTags?.SeriesDescription || "",
                    modality: seriesData.MainDicomTags?.Modality || "",
                    numberOfInstances: instances.filter(i => i !== null).length,
                    images: instances.filter(i => i !== null),
                };
            })
        );

        return {
            success: true,
            data: {
                studyInstanceUID: studyInstanceUID,
                accessionNumber: study.MainDicomTags?.AccessionNumber || "",
                patientId: patientTags.PatientID || "",
                patientName: patientTags.PatientName || "",
                studyDate: study.MainDicomTags?.StudyDate || "",
                studyDescription: study.MainDicomTags?.StudyDescription || "",
                series: series.filter(s => s !== null),
            },
        };
    } catch (error) {
        console.error("[PACS] Get study with series error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Test koneksi ke PACS Orthanc
 */
export async function testPACSConnection(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
}> {
    try {
        console.log("[PACS] Testing connection to:", PACS_ORTHANC_BASE_URL);

        const response = await fetch(`${PACS_ORTHANC_BASE_URL}/system`, {
            method: "GET",
            headers: {
                Authorization: PACS_ORTHANC_AUTH_HEADER,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[PACS] Connection test failed:", response.status, errorText);
            return {
                success: false,
                error: `PACS connection failed: ${response.status} - ${errorText}`,
            };
        }

        const data = await response.json();
        console.log("[PACS] Connection successful. Version:", data.Version);

        return {
            success: true,
            data: {
                name: data.Name,
                version: data.Version,
                url: PACS_ORTHANC_BASE_URL,
            },
        };
    } catch (error) {
        console.error("[PACS] Connection test exception:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get PACS Orthanc base URL (untuk frontend)
 */
export function getPACSBaseUrl(): string {
    return PACS_ORTHANC_BASE_URL;
}
