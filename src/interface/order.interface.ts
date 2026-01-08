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
    diagnosis: z.object({
        code: z.string().nullable(),
        display: z.string().nullable(),
    }).nullable(),
    notes: z.string().nullable(),
    observation_notes: z.string().nullable(),
    diagnostic_conclusion: z.string().nullable(),
    // Exam info from LOINC
    exam: z.object({
        id: z.string().uuid(),
        code: z.string(),
        name: z.string(),
        loinc_code: z.string(),
        loinc_display: z.string(),
    }).nullable(),
    // Modality & Workstation info
    modality: z.object({
        id: z.string().uuid(),
        code: z.string(),
        name: z.string(),
        ae_title: z.string().nullable(),
    }).nullable(),
    // Contrast info (from RIS update)
    contrast: z.object({
        code: z.string().nullable(),
        name: z.string().nullable(),
    }).nullable(),
    // KPTL code info
    kptl: z.object({
        code: z.string().nullable(),
        display: z.string().nullable(),
    }).nullable(),
    // Requester info (referring physician)
    requester: z.object({
        id: z.string().uuid(),
        id_ss: z.string().nullable(),
        name: z.string(),
    }).nullable(),
    // Performer info (radiologist assigned from RIS)
    performer: z.object({
        id: z.string().uuid(),
        id_ss: z.string().nullable(),
        name: z.string(),
    }).nullable(),
    // Flag to indicate if order can be pushed to MWL
    can_push_to_mwl: z.boolean(),
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
    }).optional(),
});

export type OrderPaginationResponse = z.infer<typeof orderPaginationResponseSchema>;

// ==================== Order API Response Schemas (HTTP Wrapper) ====================
// Full HTTP response for pagination
export const orderPaginationApiResponseSchema = z.object({
    content: orderPaginationResponseSchema,
    message: z.string(),
    errors: z.array(z.unknown()),
});

// Full HTTP response for single order
export const fullOrderApiResponseSchema = z.object({
    content: z.object({
        data: fullOrderResponseSchema,
    }),
    message: z.string(),
    errors: z.array(z.unknown()),
});

// Error response
export const orderErrorResponseSchema = z.object({
    content: z.object({
        data: z.null(),
    }),
    message: z.string(),
    errors: z.array(z.unknown()),
});

// ==================== Create Detail Order Item Schema (from SIMRS) ====================
// Schema untuk detail pemeriksaan (LOINC)
export const simrsDetailSchema = z.object({
    id_loinc: z.string().uuid().describe("LOINC ID from master data (UUID)"),
});

export type SimrsDetail = z.infer<typeof simrsDetailSchema>;

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

// ==================== Create Order Schema (from SIMRS) - NEW FORMAT ====================
export const createOrderSchema = z.object({
    // Pelayanan ID from SIMRS - required
    id_pelayanan: z.string().max(255).describe("Service ID from SIMRS"),

    // Subject (Patient info) - required
    subject: simrsSubjectSchema.describe("Patient information"),

    // Encounter - required
    encounter: simrsEncounterSchema.describe("Encounter information"),

    // Requester (Referring physician) - required
    requester: simrsRequesterSchema.describe("Referring physician information"),

    // Diagnosa (ICD-10) - optional but recommended
    diagnosa: simrsDiagnosaSchema.optional().describe("Diagnosis ICD-10 code"),

    // Order priority
    order_priority: z.enum(ORDER_PRIORITY).default("ROUTINE").describe("Order priority"),

    // Notes
    notes: z.string().optional().describe("Additional notes from SIMRS"),

    // Details - array of LOINC examinations (at least one required)
    details: z.array(simrsDetailSchema).min(1, "At least one examination detail is required").describe("Array of examination LOINC codes"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ==================== Update Detail Order Schema ====================
export const updateDetailOrderSchema = z.object({
    // Schedule & Status
    schedule_date: z.string().datetime().optional().describe("Tanggal jadwal pemeriksaan (ISO 8601)"),
    order_priority: z.enum(ORDER_PRIORITY).optional().describe("Prioritas order: ROUTINE, URGENT, ASAP, STAT"),
    order_status: z.enum(ORDER_STATUS).optional().describe("Status order: IN_REQUEST, IN_QUEUE, IN_PROGRESS, FINAL"),

    // Diagnosis (ICD-10)
    diagnosis: z.object({
        code: z.string().optional().describe("Kode ICD-10"),
        display: z.string().optional().describe("Deskripsi diagnosis"),
    }).optional().describe("Update diagnosis jika berbeda dari SIMRS"),

    // Notes
    notes: z.string().optional().describe("Catatan tambahan"),

    // Observation & Diagnostic Report (untuk dikirim ke Satu Sehat)
    observation_notes: z.string().optional().describe("Hasil pemeriksaan radiologi (valueString untuk Observation)"),
    diagnostic_conclusion: z.string().optional().describe("Kesimpulan diagnosis (conclusion untuk DiagnosticReport)"),

    // ========== Data yang perlu dilengkapi dari RIS ==========
    // Modality & Workstation
    modality_code: z.string().optional().describe("Kode modalitas DICOM (CT, MR, DX, CR, US, etc.)"),
    ae_title: z.string().optional().describe("AE Title workstation DICOM"),

    // Performer (Radiolog)
    performer_id: z.string().optional().describe("ID Satu Sehat Practitioner (radiolog)"),
    performer_name: z.string().optional().describe("Nama radiolog yang akan melakukan pemeriksaan"),

    // Contrast (optional)
    contrast_code: z.string().optional().describe("Kode KFA untuk kontras media"),
    contrast_name: z.string().optional().describe("Nama kontras media (dari KFA)"),

    // KPTL Code (optional)
    kptl_code: z.string().optional().describe("Kode KPTL (Klasifikasi Prosedur Tindakan Laboratorium)"),
    kptl_display: z.string().optional().describe("Deskripsi KPTL"),

    // ========== Satu Sehat IDs (untuk tracking/referensi) ==========
    id_service_request_ss: z.string().max(255).optional().describe("ID ServiceRequest dari Satu Sehat"),
    id_observation_ss: z.string().max(255).optional().describe("ID Observation dari Satu Sehat"),
    id_procedure_ss: z.string().max(255).optional().describe("ID Procedure dari Satu Sehat"),
    id_allergy_intolerance_ss: z.string().max(255).optional().describe("ID AllergyIntolerance dari Satu Sehat"),
});

export type UpdateDetailOrderInput = z.infer<typeof updateDetailOrderSchema>;

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
// Response yang dikembalikan ke SIMRS setelah berhasil create order
export const orderDetailCreatedSchema = z.object({
    id_detail_order: z.string().uuid().describe("ID detail order"),
    accession_number: z.string().describe("Accession number yang di-generate"),
});

export const orderCreationSuccessSchema = z.object({
    id_order: z.string().uuid().describe("ID order yang dibuat"),
    detail_orders: z.array(orderDetailCreatedSchema).describe("Array detail order dengan ACSN masing-masing"),
});

export type OrderCreationSuccess = z.infer<typeof orderCreationSuccessSchema>;
export type OrderDetailCreated = z.infer<typeof orderDetailCreatedSchema>;

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

// ==================== Complete Detail Order Schema ====================
// Schema untuk melengkapi data order sebelum dikirim ke Satu Sehat
export const completeDetailOrderSchema = z.object({
    // Update data yang belum lengkap
    modality_code: z.string().optional().describe("Modality code (e.g., DX, CT, MR)"),
    ae_title: z.string().optional().describe("AE Title untuk workstation"),
    contrast_code: z.string().optional().describe("KFA code untuk kontras"),
    contrast_name: z.string().optional().describe("Nama kontras"),
    performer_id: z.string().optional().describe("Practitioner ID untuk performer"),
    performer_name: z.string().optional().describe("Nama performer"),
    observation_id: z.string().optional().describe("Observation ID dari Satu Sehat"),
    procedure_id: z.string().optional().describe("Procedure ID dari Satu Sehat"),
    allergy_intolerance_id: z.string().optional().describe("AllergyIntolerance ID dari Satu Sehat"),
});

export type CompleteDetailOrderInput = z.infer<typeof completeDetailOrderSchema>;

// ==================== Send to Satu Sehat Schema ====================
// Schema untuk mengirim order ke Satu Sehat dan push ke MWL
export const sendToSatuSehatSchema = z.object({
    // Modality info (required)
    modality_code: z.string().describe("Modality code DICOM (e.g., DX, CT, MR, US)"),
    ae_title: z.string().describe("AE Title workstation tujuan"),

    // Performer (required)
    performer_id: z.string().describe("Satu Sehat Practitioner ID untuk radiologist"),
    performer_name: z.string().describe("Nama lengkap radiologist"),

    // Contrast (optional)
    contrast_code: z.string().optional().describe("KFA code untuk kontras (jika pakai)"),
    contrast_name: z.string().optional().describe("Nama kontras"),

    // Supporting info dari Satu Sehat (optional)
    observation_id: z.string().optional().describe("Observation ID dari Satu Sehat"),
    procedure_id: z.string().optional().describe("Procedure ID dari Satu Sehat"),
    allergy_intolerance_id: z.string().optional().describe("AllergyIntolerance ID dari Satu Sehat"),

    // MWL target (optional, default dcm4chee)
    mwl_target: z.enum(["orthanc", "dcm4chee", "both"]).optional().default("dcm4chee").describe("Target MWL server"),
});

export type SendToSatuSehatInput = z.infer<typeof sendToSatuSehatSchema>;

// ==================== Send to Satu Sehat Response ====================
export const sendToSatuSehatResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.object({
        detail_id: z.string().uuid(),
        accession_number: z.string(),
        service_request_id: z.string(),
        mwl_push: z.object({
            success: z.boolean(),
            target: z.string(),
            error: z.string().optional(),
        }),
    }).optional(),
});

export type SendToSatuSehatResponse = z.infer<typeof sendToSatuSehatResponseSchema>;
// ==================== Fetch ImagingStudy from Satu Sehat ====================
export const fetchImagingStudyParamSchema = z.object({
    accessionNumber: z.string().min(1).describe("Accession Number untuk query ImagingStudy"),
});

export type FetchImagingStudyParam = z.infer<typeof fetchImagingStudyParamSchema>;

export const fetchImagingStudyResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.object({
        detail_id: z.string().uuid(),
        accession_number: z.string(),
        imaging_study_id: z.string(),
    }).optional(),
});

export type FetchImagingStudyResponse = z.infer<typeof fetchImagingStudyResponseSchema>;

// ==================== Finalize Order Detail ====================
export const finalizeOrderDetailSchema = z.object({
    observation_notes: z.string().min(1).describe("Hasil pemeriksaan radiologi"),
    diagnostic_conclusion: z.string().min(1).describe("Kesimpulan diagnosis"),
});

export type FinalizeOrderDetailInput = z.infer<typeof finalizeOrderDetailSchema>;

export const finalizeOrderDetailResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.object({
        detail_id: z.string().uuid(),
        order_status: z.string(),
        observation_id: z.string().optional().describe("ID Observation dari Satu Sehat (jika ada encounter)"),
        diagnostic_report_id: z.string().optional().describe("ID DiagnosticReport dari Satu Sehat (jika ada encounter)"),
        sent_to_satusehat: z.boolean().describe("Apakah dikirim ke Satu Sehat"),
    }),
});

export type FinalizeOrderDetailResponse = z.infer<typeof finalizeOrderDetailResponseSchema>;

// ==================== Update Order Detail with Modality & Performer ====================
export const updateOrderDetailWithModalityPerformerSchema = z.object({
    // Modality info (required)
    id_modality: z.string().uuid().describe("ID modality dari master data"),
    ae_title: z.string().describe("AE Title workstation tujuan (dipilih dari list AET modality)"),

    // Performer/Practitioner (required)
    id_performer: z.string().uuid().describe("ID practitioner/radiologist dari master data"),
});

export type UpdateOrderDetailWithModalityPerformerInput = z.infer<typeof updateOrderDetailWithModalityPerformerSchema>;

export const updateOrderDetailWithModalityPerformerResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.object({
        detail_id: z.string().uuid(),
        accession_number: z.string(),
        order_status: z.string(),
        modality: z.object({
            id: z.string().uuid(),
            code: z.string(),
            name: z.string(),
            ae_title: z.string(),
        }),
        performer: z.object({
            id: z.string().uuid(),
            id_ss: z.string(),
            name: z.string(),
        }),
    }).optional(),
});

export type UpdateOrderDetailWithModalityPerformerResponse = z.infer<typeof updateOrderDetailWithModalityPerformerResponseSchema>;