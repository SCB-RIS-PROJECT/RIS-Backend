import { eq, inArray } from "drizzle-orm";
import db from "@/database/db";
import {
    permissionTable,
    rolePermissionTable,
    roleTable,
    userPermissionTable,
    userRoleTable,
} from "@/database/schemas/schema-role-permission";
import { userTable } from "@/database/schemas/schema-user";
import type {
    AssignPermissionToRole,
    AssignPermissionToUser,
    AssignRoleToUser,
    PermissionResponse,
    RoleResponse,
    RoleWithPermissions,
    UserPermissionsResponse,
} from "@/interface/permission.interface";
import type { ServiceResponse } from "@/entities/Service";
import { INTERNAL_SERVER_ERROR_SERVICE_RESPONSE, NotFoundWithMessage } from "@/entities/Service";

export class PermissionService {
    /**
     * Get all permissions
     */
    static async getAllPermissions(): Promise<ServiceResponse<PermissionResponse[]>> {
        try {
            const permissions = await db.select().from(permissionTable);

            return {
                status: true,
                data: permissions,
            };
        } catch (err) {
            console.error(`PermissionService.getAllPermissions: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    /**
     * Get all roles
     */
    static async getAllRoles(): Promise<ServiceResponse<RoleResponse[]>> {
        try {
            const roles = await db.select().from(roleTable);

            return {
                status: true,
                data: roles,
            };
        } catch (err) {
            console.error(`PermissionService.getAllRoles: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    /**
     * Get role with permissions
     */
    static async getRoleWithPermissions(roleId: string): Promise<ServiceResponse<RoleWithPermissions>> {
        try {
            const [role] = await db.select().from(roleTable).where(eq(roleTable.id, roleId)).limit(1);

            if (!role) {
                return NotFoundWithMessage("Role not found");
            }

            const permissions = await db
                .select({
                    permission: permissionTable,
                })
                .from(rolePermissionTable)
                .innerJoin(permissionTable, eq(rolePermissionTable.id_permission, permissionTable.id))
                .where(eq(rolePermissionTable.id_role, roleId));

            return {
                status: true,
                data: {
                    ...role,
                    permissions: permissions.map((p) => p.permission),
                },
            };
        } catch (err) {
            console.error(`PermissionService.getRoleWithPermissions: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    /**
     * Get user's permissions (from roles + direct permissions)
     */
    static async getUserPermissions(userId: string): Promise<ServiceResponse<UserPermissionsResponse>> {
        try {
            // Get user info
            const [user] = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);

            if (!user) {
                return NotFoundWithMessage("User not found");
            }

            // Get user's roles with permissions
            const userRoles = await db
                .select({
                    role: roleTable,
                })
                .from(userRoleTable)
                .innerJoin(roleTable, eq(userRoleTable.id_role, roleTable.id))
                .where(eq(userRoleTable.id_user, userId));

            const rolesWithPermissions: RoleWithPermissions[] = [];

            for (const { role } of userRoles) {
                const permissions = await db
                    .select({
                        permission: permissionTable,
                    })
                    .from(rolePermissionTable)
                    .innerJoin(permissionTable, eq(rolePermissionTable.id_permission, permissionTable.id))
                    .where(eq(rolePermissionTable.id_role, role.id));

                rolesWithPermissions.push({
                    ...role,
                    permissions: permissions.map((p) => p.permission),
                });
            }

            // Get direct permissions
            const directPermissions = await db
                .select({
                    permission: permissionTable,
                })
                .from(userPermissionTable)
                .innerJoin(permissionTable, eq(userPermissionTable.id_permission, permissionTable.id))
                .where(eq(userPermissionTable.id_user, userId));

            return {
                status: true,
                data: {
                    user_id: user.id,
                    user_email: user.email,
                    user_name: user.name,
                    roles: rolesWithPermissions,
                    direct_permissions: directPermissions.map((p) => p.permission),
                },
            };
        } catch (err) {
            console.error(`PermissionService.getUserPermissions: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    /**
     * Assign permissions to role
     */
    static async assignPermissionsToRole(
        roleId: string,
        data: AssignPermissionToRole
    ): Promise<ServiceResponse<{ message: string }>> {
        try {
            // Verify role exists
            const [role] = await db.select().from(roleTable).where(eq(roleTable.id, roleId)).limit(1);

            if (!role) {
                return NotFoundWithMessage("Role not found");
            }

            // Verify permissions exist
            const permissions = await db
                .select()
                .from(permissionTable)
                .where(inArray(permissionTable.id, data.permission_ids));

            if (permissions.length !== data.permission_ids.length) {
                return {
                    status: false,
                    err: {
                        code: 404,
                        message: "One or more permissions not found",
                    },
                };
            }

            // Insert role-permissions (ignore conflicts for existing)
            const values = data.permission_ids.map((permissionId) => ({
                id_role: roleId,
                id_permission: permissionId,
            }));

            await db.insert(rolePermissionTable).values(values).onConflictDoNothing();

            return {
                status: true,
                data: {
                    message: `Successfully assigned ${data.permission_ids.length} permission(s) to role ${role.name}`,
                },
            };
        } catch (err) {
            console.error(`PermissionService.assignPermissionsToRole: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    /**
     * Revoke permissions from role
     */
    static async revokePermissionsFromRole(
        roleId: string,
        permissionIds: string[]
    ): Promise<ServiceResponse<{ message: string }>> {
        try {
            // Verify role exists
            const [role] = await db.select().from(roleTable).where(eq(roleTable.id, roleId)).limit(1);

            if (!role) {
                return NotFoundWithMessage("Role not found");
            }

            // Delete role-permissions
            await db
                .delete(rolePermissionTable)
                .where(
                    eq(rolePermissionTable.id_role, roleId) &&
                        inArray(rolePermissionTable.id_permission, permissionIds)
                );

            return {
                status: true,
                data: {
                    message: `Successfully revoked ${permissionIds.length} permission(s) from role ${role.name}`,
                },
            };
        } catch (err) {
            console.error(`PermissionService.revokePermissionsFromRole: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    /**
     * Assign permissions directly to user
     */
    static async assignPermissionsToUser(
        userId: string,
        data: AssignPermissionToUser
    ): Promise<ServiceResponse<{ message: string }>> {
        try {
            // Verify user exists
            const [user] = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);

            if (!user) {
                return NotFoundWithMessage("User not found");
            }

            // Verify permissions exist
            const permissions = await db
                .select()
                .from(permissionTable)
                .where(inArray(permissionTable.id, data.permission_ids));

            if (permissions.length !== data.permission_ids.length) {
                return {
                    status: false,
                    err: {
                        code: 404,
                        message: "One or more permissions not found",
                    },
                };
            }

            // Insert user-permissions (ignore conflicts for existing)
            const values = data.permission_ids.map((permissionId) => ({
                id_user: userId,
                id_permission: permissionId,
            }));

            await db.insert(userPermissionTable).values(values).onConflictDoNothing();

            return {
                status: true,
                data: {
                    message: `Successfully assigned ${data.permission_ids.length} permission(s) to user ${user.email}`,
                },
            };
        } catch (err) {
            console.error(`PermissionService.assignPermissionsToUser: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    /**
     * Revoke permissions from user
     */
    static async revokePermissionsFromUser(
        userId: string,
        permissionIds: string[]
    ): Promise<ServiceResponse<{ message: string }>> {
        try {
            // Verify user exists
            const [user] = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);

            if (!user) {
                return NotFoundWithMessage("User not found");
            }

            // Delete user-permissions
            await db
                .delete(userPermissionTable)
                .where(
                    eq(userPermissionTable.id_user, userId) &&
                        inArray(userPermissionTable.id_permission, permissionIds)
                );

            return {
                status: true,
                data: {
                    message: `Successfully revoked ${permissionIds.length} permission(s) from user ${user.email}`,
                },
            };
        } catch (err) {
            console.error(`PermissionService.revokePermissionsFromUser: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    /**
     * Assign roles to user
     */
    static async assignRolesToUser(
        userId: string,
        data: AssignRoleToUser
    ): Promise<ServiceResponse<{ message: string }>> {
        try {
            // Verify user exists
            const [user] = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);

            if (!user) {
                return NotFoundWithMessage("User not found");
            }

            // Verify roles exist
            const roles = await db.select().from(roleTable).where(inArray(roleTable.id, data.role_ids));

            if (roles.length !== data.role_ids.length) {
                return {
                    status: false,
                    err: {
                        code: 404,
                        message: "One or more roles not found",
                    },
                };
            }

            // Insert user-roles (ignore conflicts for existing)
            const values = data.role_ids.map((roleId) => ({
                id_user: userId,
                id_role: roleId,
            }));

            await db.insert(userRoleTable).values(values).onConflictDoNothing();

            return {
                status: true,
                data: {
                    message: `Successfully assigned ${data.role_ids.length} role(s) to user ${user.email}`,
                },
            };
        } catch (err) {
            console.error(`PermissionService.assignRolesToUser: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    /**
     * Revoke roles from user
     */
    static async revokeRolesFromUser(
        userId: string,
        roleIds: string[]
    ): Promise<ServiceResponse<{ message: string }>> {
        try {
            // Verify user exists
            const [user] = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);

            if (!user) {
                return NotFoundWithMessage("User not found");
            }

            // Delete user-roles
            await db
                .delete(userRoleTable)
                .where(eq(userRoleTable.id_user, userId) && inArray(userRoleTable.id_role, roleIds));

            return {
                status: true,
                data: {
                    message: `Successfully revoked ${roleIds.length} role(s) from user ${user.email}`,
                },
            };
        } catch (err) {
            console.error(`PermissionService.revokeRolesFromUser: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }
}
