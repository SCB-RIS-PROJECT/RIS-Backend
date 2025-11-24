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

// ==================== Snomed CT ====================
export const snomedResponseSchema = z.object({
    id: z.string(),
    code: z.string(),
    display: z.string(),
    system: z.string(),
    category: z.string().nullable(),
    description: z.string().nullable(),
    active: z.boolean(),
    created_at: z.string(),
    updated_at: z.string().nullable(),
});

export type SnomedResponse = z.infer<typeof snomedResponseSchema>;

export const snomedQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().optional(),
});

export type SnomedQuery = z.infer<typeof snomedQuerySchema>;

export const snomedPaginationResponseSchema = z.object({
    data: z.array(snomedResponseSchema),
    meta: z.object({
        total: z.number(),
        page: z.number(),
        per_page: z.number(),
        total_pages: z.number(),
        has_next_page: z.boolean(),
        has_prev_page: z.boolean(),
    }),
});

export type SnomedPaginationResponse = z.infer<typeof snomedPaginationResponseSchema>;
