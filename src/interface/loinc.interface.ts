import { z } from "@hono/zod-openapi";
import { modalityResponseSchema } from "@/interface/modality.interface";

// ==================== LOINC Response Schema ====================
export const loincResponseSchema = z.object({
    id: z.string(),
    id_modality: z.string().nullable(),
    modality: modalityResponseSchema.optional(),
    code: z.string().nullable(),
    name: z.string(),
    loinc_code: z.string().nullable(),
    loinc_display: z.string().nullable(),
    loinc_system: z.string(),
    require_fasting: z.boolean(),
    require_pregnancy_check: z.boolean(),
    require_use_contrast: z.boolean(),
    contrast_name: z.string().nullable(),
    contrast_kfa_code: z.string().nullable(),
    is_active: z.boolean(),
    created_at: z.string(),
    updated_at: z.string().nullable(),
});
export type LoincResponse = z.infer<typeof loincResponseSchema>;

// ==================== LOINC Query Schema ====================
export const loincQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().optional(),
    id_modality: z.string().uuid().optional(),
    sort: z.enum(["code", "name", "loinc_code", "created_at"]).default("created_at"),
    dir: z.enum(["asc", "desc"]).default("desc"),
});

export type LoincQuery = z.infer<typeof loincQuerySchema>;

// ==================== LOINC Pagination Response ====================
export const loincPaginationResponseSchema = z.object({
    data: z.array(loincResponseSchema),
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

export type LoincPaginationResponse = z.infer<typeof loincPaginationResponseSchema>;

// ==================== LOINC API Response Schemas (HTTP Wrapper) ====================
// Full HTTP response for pagination
export const loincPaginationApiResponseSchema = z.object({
    content: loincPaginationResponseSchema,
    message: z.string(),
    errors: z.array(z.unknown()),
});

// Full HTTP response for single loinc
export const loincApiResponseSchema = z.object({
    content: z.object({
        data: loincResponseSchema,
    }),
    message: z.string(),
    errors: z.array(z.unknown()),
});

// Error response
export const loincErrorResponseSchema = z.object({
    content: z.object({
        data: z.null(),
    }),
    message: z.string(),
    errors: z.array(z.unknown()),
});

// ==================== Create LOINC Schema ====================
export const createLoincSchema = z.object({
    id_modality: z.string().uuid().optional(),
    code: z.string().min(1).max(255).optional(),
    name: z.string().min(1).max(255),
    loinc_code: z.string().min(1).max(50).optional(),
    loinc_display: z.string().min(1).max(255).optional(),
    loinc_system: z.string().min(1).max(255).default("http://loinc.org"),
    require_fasting: z.boolean().default(false),
    require_pregnancy_check: z.boolean().default(false),
    require_use_contrast: z.boolean().default(false),
    contrast_name: z.string().max(255).optional(),
    contrast_kfa_code: z.string().max(255).optional(),
    is_active: z.boolean().default(true),
});

export type CreateLoincInput = z.infer<typeof createLoincSchema>;

// ==================== Update LOINC Schema ====================
export const updateLoincSchema = z.object({
    id_modality: z.string().uuid().optional(),
    code: z.string().min(1).max(255).optional(),
    name: z.string().min(1).max(255).optional(),
    loinc_code: z.string().min(1).max(50).optional(),
    loinc_display: z.string().min(1).max(255).optional(),
    loinc_system: z.string().min(1).max(255).optional(),
    require_fasting: z.boolean().optional(),
    require_pregnancy_check: z.boolean().optional(),
    require_use_contrast: z.boolean().optional(),
    contrast_name: z.string().max(255).optional(),
    contrast_kfa_code: z.string().max(255).optional(),
    is_active: z.boolean().optional(),
});

export type UpdateLoincInput = z.infer<typeof updateLoincSchema>;

// ==================== LOINC ID Param Schema ====================
export const loincIdParamSchema = z.object({
    id: z.string().uuid(),
});

export type LoincIdParam = z.infer<typeof loincIdParamSchema>;
