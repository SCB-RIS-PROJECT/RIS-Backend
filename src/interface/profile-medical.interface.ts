import { z } from "@hono/zod-openapi";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { PRACTITIONER_PROFFESIONS } from "@/database/schemas/constants";
import { profileTable } from "@/database/schemas/schema-profile-medical";
import { toZodV4SchemaTyped } from "@/lib/zod-util";

// Base profile schema from table
export const profileSelectSchema = createSelectSchema(profileTable);

// Create profile input schema
export const createProfileSchema = toZodV4SchemaTyped(
    createInsertSchema(profileTable, {
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

// Update profile input schema
export const updateProfileSchema = toZodV4SchemaTyped(
    createInsertSchema(profileTable, {
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

// Profile response schema for API
export const profileResponseSchema = z.object({
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
export const profileQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().optional(),
    profession: z.enum(PRACTITIONER_PROFFESIONS).optional(),
    active: z.coerce.boolean().optional(),
    sort: z.enum(["name", "profession", "nik", "created_at"]).default("created_at"),
    dir: z.enum(["asc", "desc"]).default("desc"),
});

// Profile pagination response with API wrapper
export const profilePaginationResponseSchema = z.object({
    data: z.array(profileResponseSchema),
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

// ==================== Profile API Response Schemas (HTTP Wrapper) ====================
// Full HTTP response for pagination
export const profilePaginationApiResponseSchema = z.object({
    content: profilePaginationResponseSchema,
    message: z.string(),
    errors: z.array(z.unknown()),
});

// Full HTTP response for single profile
export const profileApiResponseSchema = z.object({
    content: z.object({
        data: profileResponseSchema,
    }),
    message: z.string(),
    errors: z.array(z.unknown()),
});

// Error response
export const profileErrorResponseSchema = z.object({
    content: z.object({
        data: z.null(),
    }),
    message: z.string(),
    errors: z.array(z.unknown()),
});

// Path params
export const profileIdParamSchema = z.object({
    id: z.string().uuid(),
});

// Types
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ProfileResponse = z.infer<typeof profileResponseSchema>;
export type ProfileQuery = z.infer<typeof profileQuerySchema>;
export type ProfilePaginationResponse = z.infer<typeof profilePaginationResponseSchema>;
export type ProfileIdParam = z.infer<typeof profileIdParamSchema>;
