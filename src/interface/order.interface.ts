import { z } from "@hono/zod-openapi";
import { ORDER_FROM, ORDER_PRIORITY, ORDER_STATUS } from "@/database/schemas/constants";
import type { LoincResponse } from "@/interface/loinc.interface";
import type { PatientResponse } from "@/interface/patient.interface";
import type { PractitionerResponse } from "@/interface/practitioner.interface";

// ==================== Order Response Schema ====================
export const orderResponseSchema = z.object({
    id: z.string().uuid(),
    id_patient: z.string().uuid().nullable(),
    patient: z.object({
        id: z.string().uuid(),
        mrn: z.string(),
        name: z.string(),
        nik: z.string(),
        gender: z.enum(["MALE", "FEMALE"]),
        birth_date: z.string().datetime(),
        phone: z.string().nullable(),
    }).optional(),
    id_practitioner: z.string().uuid().nullable(),
    practitioner: z.object({
        id: z.string().uuid(),
        name: z.string(),
        nik: z.string(),
        profession: z.string(),
        phone: z.string().nullable(),
    }).optional(),
    id_created_by: z.string().uuid().nullable(),
    created_by: z.object({
        id: z.string().uuid(),
        name: z.string(),
        email: z.string(),
    }).optional(),
    id_encounter_ss: z.string().nullable(),
    id_pelayanan: z.string().nullable(),
    patient_name: z.string().nullable(),
    patient_mrn: z.string().nullable(),
    patient_birth_date: z.string().nullable(),
    patient_age: z.number().nullable(),
    patient_gender: z.string().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime().nullable(),
});

export type OrderResponse = z.infer<typeof orderResponseSchema>;

// ==================== Detail Order Response Schema ====================
export const detailOrderResponseSchema = z.object({
    id: z.string().uuid(),
    id_order: z.string().uuid().nullable(),
    id_loinc: z.string().uuid().nullable(),
    loinc: z.object({
        id: z.string().uuid(),
        code: z.string(),
        name: z.string(),
        loinc_code: z.string(),
        loinc_display: z.string(),
        require_fasting: z.boolean(),
        require_pregnancy_check: z.boolean(),
        require_use_contrast: z.boolean(),
        contrast_name: z.string().nullable(),
        modality: z.object({
            id: z.string().uuid(),
            code: z.string(),
            name: z.string(),
        }).optional(),
    }).optional(),
    id_service_request_ss: z.string().nullable(),
    id_observation_ss: z.string().nullable(),
    id_procedure_ss: z.string().nullable(),
    id_allergy_intolerance_ss: z.string().nullable(),
    id_requester_ss: z.string().nullable(),
    requester_display: z.string().nullable(),
    id_performer_ss: z.string().nullable(),
    performer_display: z.string().nullable(),
    accession_number: z.string().nullable(),
    order_number: z.string().nullable(),
    order_date: z.string().datetime().nullable(),
    schedule_date: z.string().datetime().nullable(),
    occurrence_datetime: z.string().datetime().nullable(),
    order_priority: z.enum(ORDER_PRIORITY).nullable(),
    order_status: z.enum(ORDER_STATUS).nullable(),
    order_from: z.enum(ORDER_FROM).nullable(),
    fhir_status: z.string().nullable(),
    fhir_intent: z.string().nullable(),
    order_category_code: z.string().nullable(),
    order_category_display: z.string().nullable(),
    loinc_code_alt: z.string().nullable(),
    loinc_display_alt: z.string().nullable(),
    kptl_code: z.string().nullable(),
    kptl_display: z.string().nullable(),
    code_text: z.string().nullable(),
    modality_code: z.string().nullable(),
    ae_title: z.string().nullable(),
    contrast_code: z.string().nullable(),
    contrast_name_kfa: z.string().nullable(),
    reason_code: z.string().nullable(),
    reason_display: z.string().nullable(),
    diagnosis: z.string().nullable(),
    notes: z.string().nullable(),
    require_fasting: z.boolean().nullable(),
    require_pregnancy_check: z.boolean().nullable(),
    require_use_contrast: z.boolean().nullable(),
    service_request_json: z.any().nullable(),
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

// ==================== FHIR ServiceRequest Schema ====================
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

export const fhirServiceRequestSchema = z.object({
    resourceType: z.literal("ServiceRequest").default("ServiceRequest"),
    identifier: z.array(fhirIdentifierSchema).optional(),
    status: z.string().default("active"),
    intent: z.string().default("original-order"),
    priority: z.string().default("routine"),
    category: z.array(fhirCodeableConceptSchema).optional(),
    code: fhirCodeableConceptSchema.optional(),
    orderDetail: z.array(fhirCodeableConceptSchema).optional(),
    subject: fhirReferenceSchema.optional(),
    encounter: fhirReferenceSchema.optional(),
    occurrenceDateTime: z.string().datetime().optional(),
    requester: fhirReferenceSchema.optional(),
    performer: z.array(fhirReferenceSchema).optional(),
    reasonCode: z.array(fhirCodeableConceptSchema).optional(),
    supportingInfo: z.array(fhirReferenceSchema).optional(),
});

export type FhirServiceRequest = z.infer<typeof fhirServiceRequestSchema>;

// ==================== Create Detail Order Item Schema ====================
export const createDetailOrderItemSchema = z.object({
    id_loinc: z.string().uuid(),
    order_date: z.string().datetime().optional(),
    schedule_date: z.string().datetime().optional(),
    occurrence_datetime: z.string().datetime().optional(),
    order_priority: z.enum(ORDER_PRIORITY).default("ROUTINE"),
    order_from: z.enum(ORDER_FROM).default("INTERNAL"),
    fhir_status: z.string().optional().default("active"),
    fhir_intent: z.string().optional().default("original-order"),
    id_requester_ss: z.string().optional(),
    requester_display: z.string().optional(),
    id_performer_ss: z.string().optional(),
    performer_display: z.string().optional(),
    order_category_code: z.string().optional(),
    order_category_display: z.string().optional(),
    loinc_code_alt: z.string().optional(),
    loinc_display_alt: z.string().optional(),
    kptl_code: z.string().optional(),
    kptl_display: z.string().optional(),
    code_text: z.string().optional(),
    modality_code: z.string().optional(),
    ae_title: z.string().optional(),
    contrast_code: z.string().optional(),
    contrast_name_kfa: z.string().optional(),
    reason_code: z.string().optional(),
    reason_display: z.string().optional(),
    id_service_request_ss: z.string().optional(),
    id_observation_ss: z.string().optional(),
    id_procedure_ss: z.string().optional(),
    id_allergy_intolerance_ss: z.string().optional(),
    diagnosis: z.string().optional(),
    notes: z.string().optional(),
    // FHIR ServiceRequest (optional) - akan disimpan sebagai JSON
    service_request: fhirServiceRequestSchema.optional(),
});

export type CreateDetailOrderItem = z.infer<typeof createDetailOrderItemSchema>;

// ==================== Create Order Schema ====================
export const createOrderSchema = z.object({
    id_patient: z.string().uuid(),
    id_practitioner: z.string().uuid(),
    id_encounter_ss: z.string().max(255).optional(),
    id_pelayanan: z.string().max(255).optional(),
    patient_name: z.string().max(255).optional(),
    patient_mrn: z.string().max(100).optional(),
    patient_birth_date: z.string().optional(),
    patient_age: z.number().int().optional(),
    patient_gender: z.string().max(10).optional(),
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
export const orderCreationSuccessSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.object({
        id_order: z.string().uuid(),
        order_number: z.string(),
        created_at: z.string().datetime(),
    }),
});

export type OrderCreationSuccess = z.infer<typeof orderCreationSuccessSchema>;
