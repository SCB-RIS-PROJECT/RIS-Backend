import { z } from "@hono/zod-openapi";
import { toZodV4SchemaTyped } from "@/lib/zod-util";

export const loginPayloadSchema = toZodV4SchemaTyped(
    z.object({
        email: z.string().email().min(1).max(255),
        password: z.string().min(8).max(255),
    })
);

// Register User (non-practitioner) schema
export const registerUserPayloadSchema = toZodV4SchemaTyped(
    z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().min(1).max(255),
        password: z.string().min(8).max(255),
    })
);

// Register Practitioner schema (includes practitioner data + auth data)
export const registerPractitionerPayloadSchema = toZodV4SchemaTyped(
    z.object({
        // Auth data
        email: z.string().email().min(1).max(255),
        password: z.string().min(8).max(255),

        // Profile data that describes the practitioner
        nik: z.string().length(16),
        name: z.string().min(1).max(255),
        gender: z.enum(["MALE", "FEMALE"]),
        birth_date: z.string().datetime(),
        phone: z.string().max(20).optional(),
        address: z.string().optional(),
        id_province: z.string().optional(),
        province: z.string().optional(),
        id_city: z.string().optional(),
        city: z.string().optional(),
        id_district: z.string().optional(),
        district: z.string().optional(),
        id_sub_district: z.string().optional(),
        sub_district: z.string().optional(),
        rt: z.string().max(3).optional(),
        rw: z.string().max(3).optional(),
        postal_code: z.string().max(10).optional(),
        ihs_number: z.string().max(12).optional(),
    })
);

export const userResponseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    avatar: z.string().nullable(),
    profile_id: z.string().uuid().nullable(),
    email_verified_at: z.string().datetime().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime().nullable(),
    roles: z.array(z.string()),
    permissions: z.array(z.string()),
    profile: z.object({
        id: z.string().uuid(),
        nik: z.string().nullable(),
        name: z.string(),
        gender: z.enum(["MALE", "FEMALE"]).nullable(),
        phone: z.string().nullable(),
        email: z.string().nullable(),
        address: z.string().nullable(),
    }).nullable().optional(),
});

export const loginResponseSchema = z.object({
    message: z.string(),
    token: z.string(),
    user: userResponseSchema,
});

export const loginDataSchema = z.object({
    token: z.string(),
    user: userResponseSchema,
});

export const currentUserResponseSchema = userResponseSchema;

// ==================== Auth API Response Schemas (HTTP Wrapper) ====================
// Full HTTP response for login
export const loginApiResponseSchema = z.object({
    content: loginDataSchema,
    message: z.string(),
    errors: z.array(z.unknown()),
});

// Full HTTP response for current user
export const currentUserApiResponseSchema = z.object({
    content: z.object({
        data: currentUserResponseSchema,
    }),
    message: z.string(),
    errors: z.array(z.unknown()),
});

// Full HTTP response for register
export const registerApiResponseSchema = z.object({
    content: loginDataSchema,
    message: z.string(),
    errors: z.array(z.unknown()),
});

export type LoginPayload = z.infer<typeof loginPayloadSchema>;
export type RegisterUserPayload = z.infer<typeof registerUserPayloadSchema>;
export type RegisterPractitionerPayload = z.infer<typeof registerPractitionerPayloadSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type LoginData = z.infer<typeof loginDataSchema>;
export type CurrentUserResponse = z.infer<typeof currentUserResponseSchema>;
