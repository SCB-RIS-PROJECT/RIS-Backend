import { z } from "@hono/zod-openapi";
import { createInsertSchema } from "drizzle-zod";
import { userTable } from "@/database/schemas/schema-user";
import { toZodV4SchemaTyped } from "@/lib/zod-util";

export const loginPayloadSchema = toZodV4SchemaTyped(
    createInsertSchema(userTable, {
        email: (field) => field.email().min(1).max(255),
        password: (field) => field.min(8).max(255),
    }).omit({ id: true, name: true, avatar: true, email_verified_at: true, created_at: true, updated_at: true })
);

export const userResponseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    avatar: z.string().nullable(),
    email_verified_at: z.string().datetime().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime().nullable(),
    roles: z.array(z.string()),
    permissions: z.array(z.string()),
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

export type LoginPayload = z.infer<typeof loginPayloadSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type LoginData = z.infer<typeof loginDataSchema>;
export type CurrentUserResponse = z.infer<typeof currentUserResponseSchema>;
