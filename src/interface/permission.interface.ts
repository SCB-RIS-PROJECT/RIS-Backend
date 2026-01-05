import { z } from "@hono/zod-openapi";

// ==================== Permission Response Schema ====================
export const permissionResponseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
});

export type PermissionResponse = z.infer<typeof permissionResponseSchema>;

// ==================== Role Response Schema ====================
export const roleResponseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
});

export type RoleResponse = z.infer<typeof roleResponseSchema>;

// ==================== Role with Permissions ====================
export const roleWithPermissionsSchema = roleResponseSchema.extend({
    permissions: z.array(permissionResponseSchema),
});

export type RoleWithPermissions = z.infer<typeof roleWithPermissionsSchema>;

// ==================== User Permissions Response ====================
export const userPermissionsResponseSchema = z.object({
    user_id: z.string().uuid(),
    user_email: z.string(),
    user_name: z.string(),
    roles: z.array(roleWithPermissionsSchema),
    direct_permissions: z.array(permissionResponseSchema),
});

export type UserPermissionsResponse = z.infer<typeof userPermissionsResponseSchema>;

// ==================== Assign Permission to Role ====================
export const assignPermissionToRoleSchema = z.object({
    permission_ids: z.array(z.string().uuid()).min(1, "At least one permission is required"),
});

export type AssignPermissionToRole = z.infer<typeof assignPermissionToRoleSchema>;

// ==================== Assign Permission to User ====================
export const assignPermissionToUserSchema = z.object({
    permission_ids: z.array(z.string().uuid()).min(1, "At least one permission is required"),
});

export type AssignPermissionToUser = z.infer<typeof assignPermissionToUserSchema>;

// ==================== Revoke Permission ====================
export const revokePermissionSchema = z.object({
    permission_ids: z.array(z.string().uuid()).min(1, "At least one permission is required"),
});

export type RevokePermission = z.infer<typeof revokePermissionSchema>;

// ==================== Assign Role to User ====================
export const assignRoleToUserSchema = z.object({
    role_ids: z.array(z.string().uuid()).min(1, "At least one role is required"),
});

export type AssignRoleToUser = z.infer<typeof assignRoleToUserSchema>;

// ==================== Param Schemas ====================
export const roleIdParamSchema = z.object({
    roleId: z.string().uuid(),
});

export const userIdParamSchema = z.object({
    userId: z.string().uuid(),
});

export const permissionIdParamSchema = z.object({
    permissionId: z.string().uuid(),
});
