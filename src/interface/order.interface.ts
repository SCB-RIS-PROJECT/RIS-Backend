import { z } from "@hono/zod-openapi";
import { ORDER_FROM, ORDER_PRIORITY, ORDER_STATUS } from "@/database/schemas/constants";
import type { LoincResponse } from "@/interface/loinc.interface";
import type { PatientResponse } from "@/interface/patient.interface";
import type { PractitionerResponse } from "@/interface/practitioner.interface";

// ==================== FHIR Base Schemas ====================
export const fhirCodingSchema = z.object({
    system: z.string(),
    code: z.string().optional(),
    display: z.string().optional(),
});

export const fhirCodeableConceptSchema = z.object({
    coding: z.array(fhirCodingSchema).optional(),
    text: z.string().optional(),
});

export const fhirIdentifierSchema = z.object({
    use: z.string().optional(),
    type: fhirCodeableConceptSchema.optional(),
    system: z.string().optional(),
    value: z.string().optional(),
});

export const fhirReferenceSchema = z.object({
    reference: z.string(),
    display: z.string().optional(),
});

// ==================== SIMRS Request Schemas (Simplified) ====================

/**
 * Pemeriksaan (Examination) from SIMRS - LOINC code info
 */
export const simrsPemeriksaanSchema = z.object({
    system: z.string().default("http://loinc.org").describe("LOINC system URL"),
    code: z.string().describe("LOINC code"),
    display: z.string().describe("LOINC display name"),
    text: z.string().optional().describe("Procedure description"),
});

/**
 * Patient subject from SIMRS
 * Contains Satu Sehat Patient IHS ID + patient demographic info
 */
export const simrsSubjectSchema = z.object({
    ihs_id: z.string().describe("Satu Sehat Patient IHS ID"),
    patient_name: z.string().describe("Patient full name"),
    patient_mrn: z.string().describe("Patient MRN from SIMRS"),
    patient_birth_date: z.string().describe("Patient birth date (YYYY-MM-DD)"),
    patient_age: z.number().int().describe("Patient age in years"),
    patient_gender: z.enum(["MALE", "FEMALE"]).describe("Patient gender"),
});

/**
 * Encounter from SIMRS
 * Contains Satu Sehat Encounter ID
 */
export const simrsEncounterSchema = z.object({
    encounter_id: z.string().describe("Satu Sehat Encounter ID"),
});

/**
 * Requester (Referring Physician) from SIMRS
 */
export const simrsRequesterSchema = z.object({
    id_practitioner: z.string().describe("Satu Sehat Practitioner ID"),
    name_practitioner: z.string().describe("Practitioner name"),
});

/**
 * Diagnosa (Diagnosis) from SIMRS - ICD-10 code
 */
export const simrsDiagnosaSchema = z.object({
    system: z.string().default("http://hl7.org/fhir/sid/icd-10").describe("ICD-10 system URL"),
    code: z.string().describe("ICD-10 code"),
    display: z.string().describe("ICD-10 description"),
});

export type SimrsPemeriksaan = z.infer<typeof simrsPemeriksaanSchema>;
export type SimrsSubject = z.infer<typeof simrsSubjectSchema>;
export type SimrsEncounter = z.infer<typeof simrsEncounterSchema>;
export type SimrsRequester = z.infer<typeof simrsRequesterSchema>;
export type SimrsDiagnosa = z.infer<typeof simrsDiagnosaSchema>;

// ==================== Internal ServiceRequest JSON (stored in DB for Satu Sehat) ====================
/**
 * This is the internal format stored in service_request_json column
 * Used when sending to Satu Sehat later
 */
export interface SimrsServiceRequest {
    code?: {
        coding?: Array<{
            system?: string;
            code?: string;
            display?: string;
        }>;
        text?: string;
    };
    orderDetail?: Array<{
        coding?: Array<{
            system?: string;
            code?: string;
            display?: string;
        }>;
        text?: string;
    }>;
    subject?: {
        reference?: string;
        patient_name?: string;
        patient_mrn?: string;
        patient_birth_date?: string;
        patient_age?: number;
        patient_gender?: string;
    };
    encounter?: {
        reference?: string;
    };
    occurrenceDateTime?: string;
    requester?: {
        reference?: string;
        display?: string;
    };
    performer?: Array<{
        reference?: string;
        display?: string;
    }>;
    reasonCode?: Array<{
        coding?: Array<{
            system?: string;
            code?: string;
            display?: string;
        }>;
    }>;
    supportingInfo?: Array<{
        reference?: string;
    }>;
}

// ==================== Order Response Schema ====================
export const orderResponseSchema = z.object({
    id: z.string().uuid(),
    id_pelayanan: z.string().nullable(),
    id_encounter_ss: z.string().nullable(),
    // Patient info (embedded from SIMRS)
    patient: z.object({
        mrn: z.string().nullable(),
        name: z.string().nullable(),
        birth_date: z.string().nullable(),
        age: z.number().nullable(),
        gender: z.string().nullable(),
    }),
    // Practitioners info from service_request
    practitioners: z.object({
        requester: z.object({
            id_ss: z.string(),
            name: z.string(),
        }).nullable(),
        performers: z.array(z.object({
            id_ss: z.string(),
            name: z.string(),
        })),
    }).nullable(),
    // Created by user
    created_by: z.object({
        id: z.string().uuid(),
        name: z.string(),
        email: z.string(),
    }).nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime().nullable(),
});

export type OrderResponse = z.infer<typeof orderResponseSchema>;

// ==================== Detail Order Response Schema ====================
export const detailOrderResponseSchema = z.object({
    id: z.string().uuid(),
    accession_number: z.string().nullable(),
    order_number: z.string().nullable(),
    schedule_date: z.string().datetime().nullable(),
    order_priority: z.enum(ORDER_PRIORITY).nullable(),
    order_status: z.enum(ORDER_STATUS).nullable(),
    diagnosis: z.string().nullable(),
    notes: z.string().nullable(),
    // Exam info from LOINC
    exam: z.object({
        id: z.string().uuid(),
        code: z.string(),
        name: z.string(),
        loinc_code: z.string(),
        loinc_display: z.string(),
        require_fasting: z.boolean(),
        require_pregnancy_check: z.boolean(),
        require_use_contrast: z.boolean(),
        contrast_name: z.string().nullable(),
    }).nullable(),
    // Modality info
    modality: z.object({
        id: z.string().uuid(),
        code: z.string(),
        name: z.string(),
    }).nullable(),
    // Satu Sehat integration IDs (for tracking)
    satu_sehat: z.object({
        id_service_request: z.string().nullable(),
        id_observation: z.string().nullable(),
        id_procedure: z.string().nullable(),
    }).nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime().nullable(),
});

export type DetailOrderResponse = z.infer<typeof detailOrderResponseSchema>;

// ==================== Full Order Response with Details ====================
export const fullOrderResponseSchema = orderResponseSchema.extend({
    details: z.array(detailOrderResponseSchema),
});

export type FullOrderResponse = z.infer<typeof fullOrderResponseSchema>;

// ==================== Order Query Schema ====================
export const orderQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().optional(), // search by patient name, mrn, practitioner name
    id_patient: z.string().uuid().optional(),
    id_practitioner: z.string().uuid().optional(),
    order_status: z.enum(ORDER_STATUS).optional(),
    order_priority: z.enum(ORDER_PRIORITY).optional(),
    order_from: z.enum(ORDER_FROM).optional(),
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional(),
    sort: z.enum(["created_at", "updated_at"]).default("created_at"),
    dir: z.enum(["asc", "desc"]).default("desc"),
});

export type OrderQuery = z.infer<typeof orderQuerySchema>;

// ==================== Order Pagination Response ====================
export const orderPaginationResponseSchema = z.object({
    data: z.array(fullOrderResponseSchema),
    meta: z.object({
        total: z.number(),
        page: z.number(),
        per_page: z.number(),
        total_pages: z.number(),
        has_next_page: z.boolean(),
        has_prev_page: z.boolean(),
    }),
});

export type OrderPaginationResponse = z.infer<typeof orderPaginationResponseSchema>;

// ==================== Create Detail Order Item Schema (from SIMRS) ====================
export const createDetailOrderItemSchema = z.object({
    // Scheduling - ccurence_date_time (occurrence datetime)
    ccurence_date_time: z.string().datetime().optional().describe("Occurrence datetime (ISO 8601)"),
    order_priority: z.enum(ORDER_PRIORITY).default("ROUTINE"),
    
    // Notes
    notes: z.string().optional().describe("Additional notes from SIMRS"),

    // Pemeriksaan (LOINC code info) - required
    pemeriksaan: simrsPemeriksaanSchema.describe("LOINC code information for the examination"),
    
    // Subject (Patient info) - required
    subject: simrsSubjectSchema.describe("Patient information"),
    
    // Encounter - required
    encounter: simrsEncounterSchema.describe("Encounter information"),
    
    // Requester (Referring physician) - required
    requester: simrsRequesterSchema.describe("Referring physician information"),
    
    // Diagnosa (ICD-10) - optional but recommended
    diagnosa: simrsDiagnosaSchema.optional().describe("Diagnosis ICD-10 code"),
});

export type CreateDetailOrderItem = z.infer<typeof createDetailOrderItemSchema>;

// ==================== Create Order Schema (from SIMRS) ====================
export const createOrderSchema = z.object({
    // Pelayanan ID from SIMRS - optional
    id_pelayanan: z.string().max(255).optional().describe("Service ID from SIMRS"),
    
    // Order details - at least one required
    details: z.array(createDetailOrderItemSchema).min(1, "At least one order detail is required"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ==================== Update Detail Order Schema ====================
export const updateDetailOrderSchema = z.object({
    schedule_date: z.string().datetime().optional(),
    order_priority: z.enum(ORDER_PRIORITY).optional(),
    order_status: z.enum(ORDER_STATUS).optional(),
    diagnosis: z.string().optional(),
    notes: z.string().optional(),
    id_service_request_ss: z.string().max(255).optional(),
    id_observation_ss: z.string().max(255).optional(),
    id_procedure_ss: z.string().max(255).optional(),
});

export type UpdateDetailOrderInput = z.infer<typeof updateDetailOrderSchema>;

// ==================== Update Order Schema ====================
export const updateOrderSchema = z.object({
    id_practitioner: z.string().uuid().optional(),
    id_encounter_ss: z.string().max(255).optional(),
});

export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

// ==================== Order ID Param Schema ====================
export const orderIdParamSchema = z.object({
    id: z.string().uuid(),
});

export type OrderIdParam = z.infer<typeof orderIdParamSchema>;

// ==================== Detail Order ID Param Schema ====================
export const detailOrderIdParamSchema = z.object({
    id: z.string().uuid(),
    detailId: z.string().uuid(),
});

export type DetailOrderIdParam = z.infer<typeof detailOrderIdParamSchema>;

// ==================== Order Creation Success Response (for SIMRS) ====================
// Simple response: return success message only
// Satu Sehat will be sent later after RIS completes the order
export const orderCreationSuccessSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});

export type OrderCreationSuccess = z.infer<typeof orderCreationSuccessSchema>;

// ==================== MWL Push Response ====================
export const mwlPushResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    results: z.array(z.object({
        detailId: z.string().uuid(),
        accessionNumber: z.string(),
        success: z.boolean(),
        target: z.string().optional(),
        instanceId: z.string().optional(),
        error: z.string().optional(),
    })),
});

export type MWLPushResponse = z.infer<typeof mwlPushResponseSchema>;

// ==================== Satu Sehat Push Response ====================
export const satuSehatPushResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    results: z.array(z.object({
        detailId: z.string().uuid(),
        accessionNumber: z.string(),
        success: z.boolean(),
        id_service_request_ss: z.string().optional(),
        error: z.string().optional(),
    })),
});

export type SatuSehatPushResponse = z.infer<typeof satuSehatPushResponseSchema>;
