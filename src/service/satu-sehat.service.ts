// biome-ignore-all lint/correctness/noUnusedPrivateClassMembers: <because service>

import env from "@/config/env";
import type {
    FHIREncounter,
    FHIREncounterResponse,
    FHIRServiceRequest,
    FHIRServiceRequestResponse,
    IHSPatientBundle,
    IHSPractitionerBundle,
    ServiceRequestParams,
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
        // Note: env.SATU_SEHAT_AUTH_URL already includes the full path with query string
        const url = env.SATU_SEHAT_AUTH_URL;

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

    /**
     * Build FHIR ServiceRequest object for Satu Sehat
     */
    static buildServiceRequest(params: ServiceRequestParams): FHIRServiceRequest {
        const serviceRequest: FHIRServiceRequest = {
            resourceType: "ServiceRequest",
            identifier: [
                // ServiceRequest ID (if updating existing)
                ...(params.serviceRequestId
                    ? [
                          {
                              system: `http://sys-ids.kemkes.go.id/servicerequest/${params.organizationId}`,
                              value: params.serviceRequestId,
                          },
                      ]
                    : []),
                // Accession Number (ACSN)
                {
                    use: "usual",
                    type: {
                        coding: [
                            {
                                system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                                code: "ACSN",
                            },
                        ],
                    },
                    system: `http://sys-ids.kemkes.go.id/acsn/${params.organizationId}`,
                    value: params.accessionNumber,
                },
            ],
            status: params.status || "active",
            intent: params.intent || "original-order",
            priority: params.priority || "routine",
            category: [
                {
                    coding: [
                        {
                            system: "http://snomed.info/sct",
                            code: "363679005",
                            display: "Imaging",
                        },
                    ],
                },
            ],
            code: {
                coding: [
                    // LOINC code (required)
                    {
                        system: "http://loinc.org",
                        code: params.loincCode,
                        display: params.loincDisplay,
                    },
                    // KPTL code (if provided)
                    ...(params.kptlCode && params.kptlDisplay
                        ? [
                              {
                                  system: "http://terminology.kemkes.go.id/CodeSystem/kptl",
                                  code: params.kptlCode,
                                  display: params.kptlDisplay,
                              },
                          ]
                        : []),
                ],
                text: params.codeText || params.loincDisplay,
            },
            orderDetail: [
                // Modality code
                ...(params.modalityCode
                    ? [
                          {
                              coding: [
                                  {
                                      system: "http://dicom.nema.org/resources/ontology/DCM",
                                      code: params.modalityCode,
                                  },
                              ],
                              text: `Modality Code: ${params.modalityCode}`,
                          },
                      ]
                    : []),
                // AE Title
                ...(params.aeTitle
                    ? [
                          {
                              coding: [
                                  {
                                      system: "http://sys-ids.kemkes.go.id/ae-title",
                                      display: params.aeTitle,
                                  },
                              ],
                          },
                      ]
                    : []),
                // Contrast KFA
                ...(params.contrastKfaCode
                    ? [
                          {
                              coding: [
                                  {
                                      system: "http://sys-ids.kemkes.go.id/kfa",
                                      code: params.contrastKfaCode,
                                      display: params.contrastKfaDisplay || params.contrastKfaCode,
                                  },
                              ],
                          },
                      ]
                    : []),
            ],
            subject: {
                reference: `Patient/${params.patientId}`,
            },
            encounter: {
                reference: `Encounter/${params.encounterId}`,
            },
            requester: {
                reference: `Practitioner/${params.requesterId}`,
                display: params.requesterDisplay,
            },
        };

        // Optional: occurrenceDateTime
        if (params.occurrenceDateTime) {
            serviceRequest.occurrenceDateTime = params.occurrenceDateTime;
        }

        // Optional: performer
        if (params.performerId) {
            serviceRequest.performer = [
                {
                    reference: `Practitioner/${params.performerId}`,
                    display: params.performerDisplay,
                },
            ];
        }

        // Optional: reasonCode (diagnosis)
        if (params.reasonIcdCode) {
            serviceRequest.reasonCode = [
                {
                    coding: [
                        {
                            system: "http://hl7.org/fhir/sid/icd-10",
                            code: params.reasonIcdCode,
                            display: params.reasonIcdDisplay || params.reasonIcdCode,
                        },
                    ],
                },
            ];
        }

        // Optional: supportingInfo
        const supportingInfo: Array<{ reference: string }> = [];
        if (params.observationId) {
            supportingInfo.push({ reference: `Observation/${params.observationId}` });
        }
        if (params.procedureId) {
            supportingInfo.push({ reference: `Procedure/${params.procedureId}` });
        }
        if (params.allergyIntoleranceId) {
            supportingInfo.push({ reference: `AllergyIntolerance/${params.allergyIntoleranceId}` });
        }
        if (supportingInfo.length > 0) {
            serviceRequest.supportingInfo = supportingInfo;
        }

        return serviceRequest;
    }

    /**
     * Post ServiceRequest to Satu Sehat API
     */
    static async postServiceRequest(serviceRequest: FHIRServiceRequest): Promise<FHIRServiceRequestResponse> {
        const token = await SatuSehatService.getAccessToken();

        const url = `${env.SATU_SEHAT_BASE_URL}/ServiceRequest`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(serviceRequest),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to post ServiceRequest: ${response.statusText} - ${errorText}`);
        }

        const data = (await response.json()) as FHIRServiceRequestResponse;
        return data;
    }

    /**
     * Update ServiceRequest in Satu Sehat API
     */
    static async putServiceRequest(
        serviceRequestId: string,
        serviceRequest: FHIRServiceRequest
    ): Promise<FHIRServiceRequestResponse> {
        const token = await SatuSehatService.getAccessToken();

        const url = `${env.SATU_SEHAT_BASE_URL}/ServiceRequest/${serviceRequestId}`;

        const response = await fetch(url, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ ...serviceRequest, id: serviceRequestId }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update ServiceRequest: ${response.statusText} - ${errorText}`);
        }

        const data = (await response.json()) as FHIRServiceRequestResponse;
        return data;
    }
}
