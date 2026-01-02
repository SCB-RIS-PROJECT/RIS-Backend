import { z } from "@hono/zod-openapi";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { patientTable } from "@/database/schemas/schema-patient";
import { toZodV4SchemaTyped } from "@/lib/zod-util";

// Base patient schema from table
export const patientSelectSchema = createSelectSchema(patientTable);

// Create patient input schema
export const createPatientSchema = toZodV4SchemaTyped(
    createInsertSchema(patientTable, {
        nik: (field) => field.length(16),
        name: (field) => field.min(1).max(255),
        phone: (field) => field.max(20).optional(),
        email: (field) => field.email().optional(),
        ihs_number: (field) => field.max(12).optional(),
        mrn: (field) => field.length(6).optional(),
        birth_date: z.string().datetime(),
        ihs_last_sync: z.string().datetime().optional(),
    }).omit({
        id: true,
        created_at: true,
        updated_at: true,
        mrn: true, // Auto-generated
    })
);

// Update patient input schema
export const updatePatientSchema = toZodV4SchemaTyped(
    createInsertSchema(patientTable, {
        nik: (field) => field.length(16).optional(),
        name: (field) => field.min(1).max(255).optional(),
        phone: (field) => field.max(20).optional(),
        email: (field) => field.email().optional(),
        ihs_number: (field) => field.max(12).optional(),
        birth_date: z.string().datetime().optional(),
        ihs_last_sync: z.string().datetime().optional(),
    })
        .omit({
            id: true,
            created_at: true,
            updated_at: true,
            mrn: true,
        })
        .partial()
);

// Patient response schema for API
export const patientResponseSchema = z.object({
    id: z.string().uuid(),
    mrn: z.string(),
    ihs_number: z.string().nullable(),
    ihs_last_sync: z.string().datetime().nullable(),
    ihs_response_status: z.string().nullable(),
    nik: z.string(),
    name: z.string(),
    gender: z.enum(["MALE", "FEMALE"]),
    birth_date: z.string().datetime(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    address: z.string().nullable(),
    id_province: z.string().nullable(),
    province: z.string().nullable(),
    id_city: z.string().nullable(),
    city: z.string().nullable(),
    id_district: z.string().nullable(),
    district: z.string().nullable(),
    id_sub_district: z.string().nullable(),
    sub_district: z.string().nullable(),
    rt: z.string().nullable(),
    rw: z.string().nullable(),
    postal_code: z.string().nullable(),
    emergency_contact_name: z.string().nullable(),
    emergency_contact_phone: z.string().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime().nullable(),
});

// Pagination query params
export const patientQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().optional(),
    sort: z.enum(["name", "mrn", "nik", "created_at"]).default("created_at"),
    dir: z.enum(["asc", "desc"]).default("desc"),
});

// Patient pagination response with API wrapper
export const patientPaginationResponseSchema = z.object({
    data: z.array(patientResponseSchema),
    message: z.string(),
    code: z.number(),
    meta: z.object({
        total: z.number(),
        page: z.number(),
        per_page: z.number(),
        total_pages: z.number(),
        has_next_page: z.boolean(),
        has_prev_page: z.boolean(),
    }).optional(),
});

// Single patient response with API wrapper
export const patientApiResponseSchema = z.object({
    data: patientResponseSchema,
});

// Error response with API wrapper
export const patientErrorResponseSchema = z.object({
    data: z.null(),
});

// Path params
export const patientIdParamSchema = z.object({
    id: z.string().uuid(),
});

// Types
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientResponse = z.infer<typeof patientResponseSchema>;
export type PatientQuery = z.infer<typeof patientQuerySchema>;
export type PatientPaginationResponse = z.infer<typeof patientPaginationResponseSchema>;
export type PatientIdParam = z.infer<typeof patientIdParamSchema>;
