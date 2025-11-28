import { z } from "@hono/zod-openapi";

// ==================== Modality Response Schema ====================
export const modalityResponseSchema = z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    is_active: z.boolean(),
    created_at: z.string(),
    updated_at: z.string().nullable(),
});

export type ModalityResponse = z.infer<typeof modalityResponseSchema>;

// ==================== Modality Query Schema ====================
export const modalityQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().optional(),
    sort: z.enum(["code", "name", "created_at"]).default("created_at"),
    dir: z.enum(["asc", "desc"]).default("desc"),
});

export type ModalityQuery = z.infer<typeof modalityQuerySchema>;

// ==================== Modality Pagination Response ====================
export const modalityPaginationResponseSchema = z.object({
    data: z.array(modalityResponseSchema),
    meta: z.object({
        total: z.number(),
        page: z.number(),
        per_page: z.number(),
        total_pages: z.number(),
        has_next_page: z.boolean(),
        has_prev_page: z.boolean(),
    }),
});

export type ModalityPaginationResponse = z.infer<typeof modalityPaginationResponseSchema>;

// ==================== Create Modality Schema ====================
export const createModalitySchema = z.object({
    code: z.string().min(1).max(255),
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    is_active: z.boolean().default(true),
});

export type CreateModalityInput = z.infer<typeof createModalitySchema>;

// ==================== Update Modality Schema ====================
export const updateModalitySchema = z.object({
    code: z.string().min(1).max(255).optional(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
});

export type UpdateModalityInput = z.infer<typeof updateModalitySchema>;

// ==================== Modality ID Param Schema ====================
export const modalityIdParamSchema = z.object({
    id: z.string().uuid(),
});

export type ModalityIdParam = z.infer<typeof modalityIdParamSchema>;
