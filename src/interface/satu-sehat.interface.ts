import { z } from "@hono/zod-openapi";

// ==================== Token Response ====================
export const satuSehatTokenResponseSchema = z.object({
    refresh_token_expires_in: z.string(),
    api_product_list: z.string(),
    api_product_list_json: z.array(z.string()),
    organization_name: z.string(),
    "developer.email": z.string(),
    token_type: z.string(),
    issued_at: z.string(),
    client_id: z.string(),
    access_token: z.string(),
    application_name: z.string(),
    scope: z.string(),
    expires_in: z.string(),
    refresh_count: z.string(),
    status: z.string(),
});

export type SatuSehatTokenResponse = z.infer<typeof satuSehatTokenResponseSchema>;

// ==================== IHS Patient Response ====================
export const ihsPatientIdentifierSchema = z.object({
    system: z.string(),
    value: z.string(),
    use: z.string().optional(),
});

export const ihsPatientMetaSchema = z.object({
    lastUpdated: z.string(),
    versionId: z.string(),
});

export const ihsPatientNameSchema = z.object({
    text: z.string(),
    use: z.string().optional(),
});

export const ihsPatientResourceSchema = z.object({
    id: z.string(),
    identifier: z.array(ihsPatientIdentifierSchema),
    meta: ihsPatientMetaSchema,
    name: z.array(ihsPatientNameSchema),
    resourceType: z.literal("Patient"),
    active: z.boolean().optional(),
    link: z.array(z.any()).optional(),
});

export const ihsPatientEntrySchema = z.object({
    fullUrl: z.string(),
    resource: ihsPatientResourceSchema,
});

export const ihsPatientBundleSchema = z.object({
    entry: z.array(ihsPatientEntrySchema).optional(),
    link: z.array(z.any()),
    resourceType: z.literal("Bundle"),
    total: z.number(),
    type: z.string(),
});

export type IHSPatientBundle = z.infer<typeof ihsPatientBundleSchema>;
export type IHSPatientResource = z.infer<typeof ihsPatientResourceSchema>;

// ==================== IHS Practitioner Response ====================
export const ihsPractitionerIdentifierSchema = z.object({
    system: z.string(),
    value: z.string(),
    use: z.string().optional(),
});

export const ihsPractitionerMetaSchema = z.object({
    lastUpdated: z.string(),
    versionId: z.string(),
});

export const ihsPractitionerNameSchema = z.object({
    text: z.string(),
    use: z.string().optional(),
});

export const ihsPractitionerResourceSchema = z.object({
    id: z.string(),
    identifier: z.array(ihsPractitionerIdentifierSchema),
    meta: ihsPractitionerMetaSchema,
    name: z.array(ihsPractitionerNameSchema),
    resourceType: z.literal("Practitioner"),
    birthDate: z.string().optional(),
    gender: z.string().optional(),
    address: z.array(z.any()).optional(),
    qualification: z.array(z.any()).optional(),
});

export const ihsPractitionerEntrySchema = z.object({
    fullUrl: z.string(),
    resource: ihsPractitionerResourceSchema,
});

export const ihsPractitionerBundleSchema = z.object({
    entry: z.array(ihsPractitionerEntrySchema).optional(),
    link: z.array(z.any()),
    resourceType: z.literal("Bundle"),
    total: z.number(),
    type: z.string(),
});

export type IHSPractitionerBundle = z.infer<typeof ihsPractitionerBundleSchema>;
export type IHSPractitionerResource = z.infer<typeof ihsPractitionerResourceSchema>;

// ==================== NIK Param Schema ====================
export const nikParamSchema = z.object({
    nik: z.string().length(16, "NIK must be exactly 16 characters"),
});

export type NikParam = z.infer<typeof nikParamSchema>;

// ==================== FHIR Encounter ====================
export interface FHIREncounterParams {
    status: "arrived" | "in-progress" | "finished" | "cancelled";
    patientID: string;
    patientName: string;
    practitionerID: string;
    practitionerName: string;
    startTime: Date;
    organizationID: string;
    organizationIHSNumber: string;
    locationID: string;
    locationName: string;
    classCode: string;
    classDisplay: string;
}

export interface FHIREncounter {
    resourceType: "Encounter";
    id?: string;
    identifier: Array<{
        system: string;
        value: string;
    }>;
    status: "arrived" | "in-progress" | "finished" | "cancelled";
    class: {
        system: string;
        code: string;
        display: string;
    };
    subject: {
        reference: string;
        display: string;
    };
    participant: Array<{
        type: Array<{
            coding: Array<{
                system: string;
                code: string;
                display: string;
            }>;
        }>;
        individual: {
            reference: string;
            display: string;
        };
    }>;
    period: {
        start: string;
    };
    location: Array<{
        location: {
            reference: string;
            display: string;
        };
    }>;
    statusHistory?: Array<{
        status: string;
        period: {
            start: string;
        };
    }>;
    serviceProvider?: {
        reference: string;
    };
}

export interface FHIREncounterResponse {
    resourceType: "Encounter";
    id: string;
    identifier: Array<{
        system: string;
        value: string;
    }>;
    status: string;
    class: {
        system: string;
        code: string;
        display: string;
    };
    subject: {
        reference: string;
        display: string;
    };
    participant: Array<{
        type: Array<{
            coding: Array<{
                system: string;
                code: string;
                display: string;
            }>;
        }>;
        individual: {
            reference: string;
            display: string;
        };
    }>;
    period: {
        start: string;
    };
    location: Array<{
        location: {
            reference: string;
            display: string;
        };
    }>;
}

// ==================== FHIR ServiceRequest for Satu Sehat ====================

/**
 * FHIR Coding element
 */
export interface FHIRCoding {
    system: string;
    code?: string;
    display?: string;
}

/**
 * FHIR CodeableConcept element
 */
export interface FHIRCodeableConcept {
    coding?: FHIRCoding[];
    text?: string;
}

/**
 * FHIR Reference element
 */
export interface FHIRReference {
    reference: string;
    display?: string;
}

/**
 * FHIR Identifier element
 */
export interface FHIRIdentifier {
    use?: string;
    type?: FHIRCodeableConcept;
    system?: string;
    value?: string;
}

/**
 * ServiceRequest resource for Satu Sehat
 * Based on: https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/ServiceRequest
 */
export interface FHIRServiceRequest {
    resourceType: "ServiceRequest";
    id?: string;
    identifier?: FHIRIdentifier[];
    status: "draft" | "active" | "on-hold" | "revoked" | "completed" | "entered-in-error" | "unknown";
    intent: "proposal" | "plan" | "directive" | "order" | "original-order" | "reflex-order" | "filler-order" | "instance-order" | "option";
    priority?: "routine" | "urgent" | "asap" | "stat";
    category?: FHIRCodeableConcept[];
    code?: FHIRCodeableConcept;
    orderDetail?: FHIRCodeableConcept[];
    subject: FHIRReference;
    encounter?: FHIRReference;
    occurrenceDateTime?: string;
    requester?: FHIRReference;
    performer?: FHIRReference[];
    reasonCode?: FHIRCodeableConcept[];
    supportingInfo?: FHIRReference[];
}

/**
 * ServiceRequest response from Satu Sehat
 */
export interface FHIRServiceRequestResponse extends FHIRServiceRequest {
    id: string;
    meta?: {
        versionId: string;
        lastUpdated: string;
    };
}

/**
 * Parameters to build ServiceRequest for Satu Sehat
 */
export interface ServiceRequestParams {
    // Organization info
    organizationId: string;

    // Identifiers
    accessionNumber: string;
    serviceRequestId?: string; // If already exists in Satu Sehat

    // FHIR metadata
    status?: "draft" | "active" | "on-hold" | "revoked" | "completed" | "entered-in-error" | "unknown";
    intent?: "proposal" | "plan" | "directive" | "order" | "original-order" | "reflex-order" | "filler-order" | "instance-order" | "option";
    priority?: "routine" | "urgent" | "asap" | "stat";

    // Code (Procedure/Exam)
    loincCode: string;
    loincDisplay: string;
    kptlCode?: string;
    kptlDisplay?: string;
    codeText?: string;

    // Order Detail
    modalityCode?: string;
    aeTitle?: string;
    contrastKfaCode?: string;
    contrastKfaDisplay?: string;

    // Subject (Patient)
    patientId: string;

    // Encounter
    encounterId: string;

    // Schedule
    occurrenceDateTime?: string;

    // Requester (Referring Physician)
    requesterId: string;
    requesterDisplay?: string;

    // Performer (Radiologist) - optional
    performerId?: string;
    performerDisplay?: string;

    // Reason (Diagnosis)
    reasonIcdCode?: string;
    reasonIcdDisplay?: string;

    // Supporting Info - optional
    observationId?: string;
    procedureId?: string;
    allergyIntoleranceId?: string;
}
