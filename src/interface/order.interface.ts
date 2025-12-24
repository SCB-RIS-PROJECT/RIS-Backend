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

// ==================== SIMRS Request Schemas ====================

/**
 * Patient subject from SIMRS
 * Contains Satu Sehat Patient ID + patient demographic info
 */
export const simrsPatientSubjectSchema = z.object({
    // Required: Satu Sehat Patient ID
    reference: z.string().describe("Format: Patient/{id_patient_ss}"),
    // Required: Patient demographic info for display and MWL
    patient_name: z.string().describe("Patient full name"),
    patient_mrn: z.string().describe("Patient MRN from SIMRS"),
    patient_birth_date: z.string().describe("Patient birth date (YYYY-MM-DD)"),
    patient_age: z.number().int().describe("Patient age in years"),
    patient_gender: z.enum(["MALE", "FEMALE"]).describe("Patient gender"),
});

/**
 * Encounter reference from SIMRS
 * Contains Satu Sehat Encounter ID
 */
export const simrsEncounterSchema = z.object({
    reference: z.string().describe("Format: Encounter/{id_encounter_ss}"),
});

/**
 * Requester (Referring Physician) from SIMRS
 */
export const simrsRequesterSchema = z.object({
    reference: z.string().describe("Format: Practitioner/{id_practitioner_ss}"),
    display: z.string().describe("Practitioner name"),
});

/**
 * Performer (Radiologist) from SIMRS - optional
 */
export const simrsPerformerSchema = z.object({
    reference: z.string().describe("Format: Practitioner/{id_performer_ss}"),
    display: z.string().optional().describe("Performer name"),
});

/**
 * Reason/Diagnosis code from SIMRS
 */
export const simrsReasonCodeSchema = z.object({
    coding: z.array(z.object({
        system: z.string().default("http://hl7.org/fhir/sid/icd-10"),
        code: z.string().describe("ICD-10 code"),
        display: z.string().describe("ICD-10 display"),
    })),
});

/**
 * Supporting Info (optional references)
 */
export const simrsSupportingInfoSchema = z.object({
    reference: z.string().describe("Format: {ResourceType}/{id}"),
});

/**
 * Service Request from SIMRS (embedded in detail)
 * This contains FHIR-like structure that RIS will use to build ServiceRequest for Satu Sehat
 */
export const simrsServiceRequestSchema = z.object({
    // Code: LOINC + KPTL
    code: z.object({
        coding: z.array(fhirCodingSchema).min(1).describe("At least LOINC code required"),
        text: z.string().optional().describe("Free text description of procedure"),
    }),

    // Order Detail: Modality, AE Title, Contrast
    orderDetail: z.array(fhirCodeableConceptSchema).optional(),

    // Subject: Patient info (required)
    subject: simrsPatientSubjectSchema,

    // Encounter: Satu Sehat Encounter ID (required)
    encounter: simrsEncounterSchema,

    // Occurrence: Scheduled datetime (optional, RIS can set default)
    occurrenceDateTime: z.string().datetime().optional(),

    // Requester: Referring physician (required)
    requester: simrsRequesterSchema,

    // Performer: Radiologist (optional)
    performer: z.array(simrsPerformerSchema).optional(),

    // Reason: Diagnosis/ICD-10 (optional but recommended)
    reasonCode: z.array(simrsReasonCodeSchema).optional(),

    // Supporting Info: Observation, Procedure, AllergyIntolerance IDs (optional)
    supportingInfo: z.array(simrsSupportingInfoSchema).optional(),
});

export type SimrsServiceRequest = z.infer<typeof simrsServiceRequestSchema>;

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
    // Practitioner info (if linked)
    practitioner: z.object({
        id: z.string().uuid(),
        name: z.string(),
        nik: z.string(),
        profession: z.string(),
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
    // LOINC reference - Required
    id_loinc: z.string().uuid().describe("LOINC ID from RIS master data"),
    
    // Scheduling - optional, RIS will set defaults
    order_date: z.string().datetime().optional().describe("Order date, default: now"),
    schedule_date: z.string().datetime().optional().describe("Scheduled examination date"),
    order_priority: z.enum(ORDER_PRIORITY).default("ROUTINE"),
    order_from: z.enum(ORDER_FROM).default("EXTERNAL"),
    
    // Notes
    notes: z.string().optional().describe("Additional notes from SIMRS"),

    // FHIR ServiceRequest from SIMRS (required for Satu Sehat integration)
    service_request: simrsServiceRequestSchema.describe("FHIR ServiceRequest data from SIMRS"),
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
// Simple response: return what SIMRS sent + id_order + Satu Sehat result
export const orderCreationSuccessSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.object({
        id_order: z.string().uuid().describe("Order ID from RIS"),
        id_pelayanan: z.string().nullable().describe("Service ID from SIMRS (echoed back)"),
        details: z.array(z.object({
            id_loinc: z.string().uuid(),
            accession_number: z.string().describe("Generated ACSN"),
            schedule_date: z.string().datetime().nullable(),
            order_priority: z.enum(ORDER_PRIORITY),
            notes: z.string().nullable(),
        })),
    }),
    satu_sehat: z.object({
        sent: z.boolean().describe("Whether sending to Satu Sehat was attempted"),
        success: z.boolean().describe("Whether all ServiceRequests were sent successfully"),
        message: z.string().describe("Summary message"),
        results: z.array(z.object({
            accession_number: z.string(),
            success: z.boolean(),
            id_service_request_ss: z.string().optional(),
            error: z.string().optional(),
        })),
    }).optional().describe("Satu Sehat send result (only if attempted)"),
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
