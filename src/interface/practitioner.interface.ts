import { z } from "@hono/zod-openapi";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { PRACTITIONER_PROFFESIONS } from "@/database/schemas/constants";
import { practitionerTable } from "@/database/schemas/schema-practitioner";
import { toZodV4SchemaTyped } from "@/lib/zod-util";

// Base practitioner schema from table
export const practitionerSelectSchema = createSelectSchema(practitionerTable);

// Create practitioner input schema
export const createPractitionerSchema = toZodV4SchemaTyped(
    createInsertSchema(practitionerTable, {
        nik: (field) => field.length(16),
        name: (field) => field.min(1).max(255),
        phone: (field) => field.max(20).optional(),
        email: (field) => field.email().optional(),
        ihs_number: (field) => field.max(12).optional(),
        birth_date: z.string().datetime(),
        ihs_last_sync: z.string().datetime().optional(),
        profession: z.enum(PRACTITIONER_PROFFESIONS),
        gender: z.enum(["MALE", "FEMALE"]),
        active: z.boolean().default(true),
    }).omit({
        id: true,
        created_at: true,
        updated_at: true,
    })
);

// Update practitioner input schema
export const updatePractitionerSchema = toZodV4SchemaTyped(
    createInsertSchema(practitionerTable, {
        nik: (field) => field.length(16).optional(),
        name: (field) => field.min(1).max(255).optional(),
        phone: (field) => field.max(20).optional(),
        email: (field) => field.email().optional(),
        ihs_number: (field) => field.max(12).optional(),
        birth_date: z.string().datetime().optional(),
        ihs_last_sync: z.string().datetime().optional(),
        profession: z.enum(PRACTITIONER_PROFFESIONS).optional(),
        gender: z.enum(["MALE", "FEMALE"]).optional(),
        active: z.boolean().optional(),
    })
        .omit({
            id: true,
            created_at: true,
            updated_at: true,
        })
        .partial()
);

// Practitioner response schema for API
export const practitionerResponseSchema = z.object({
    id: z.string().uuid(),
    ihs_number: z.string().nullable(),
    ihs_last_sync: z.string().datetime().nullable(),
    ihs_response_status: z.string().nullable(),
    profession: z.enum(PRACTITIONER_PROFFESIONS),
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
    active: z.boolean(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime().nullable(),
});

// Pagination query params
export const practitionerQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().optional(),
    profession: z.enum(PRACTITIONER_PROFFESIONS).optional(),
    active: z.coerce.boolean().optional(),
    sort: z.enum(["name", "profession", "nik", "created_at"]).default("created_at"),
    dir: z.enum(["asc", "desc"]).default("desc"),
});

// Practitioner pagination response with API wrapper
export const practitionerPaginationResponseSchema = z.object({
    data: z.array(practitionerResponseSchema),
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

// Single practitioner response with API wrapper
export const practitionerApiResponseSchema = z.object({
    data: practitionerResponseSchema,
    message: z.string(),
    code: z.number(),
});

// Error response with API wrapper
export const practitionerErrorResponseSchema = z.object({
    data: z.null(),
    message: z.string(),
    code: z.number(),
});

// Path params
export const practitionerIdParamSchema = z.object({
    id: z.string().uuid(),
});

// Types
export type CreatePractitionerInput = z.infer<typeof createPractitionerSchema>;
export type UpdatePractitionerInput = z.infer<typeof updatePractitionerSchema>;
export type PractitionerResponse = z.infer<typeof practitionerResponseSchema>;
export type PractitionerQuery = z.infer<typeof practitionerQuerySchema>;
export type PractitionerPaginationResponse = z.infer<typeof practitionerPaginationResponseSchema>;
export type PractitionerIdParam = z.infer<typeof practitionerIdParamSchema>;
