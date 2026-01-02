import { and, eq, type InferSelectModel, inArray } from "drizzle-orm";
import db from "@/database/db";
import {
    permissionTable,
    rolePermissionTable,
    roleTable,
    userPermissionTable,
    userRoleTable,
} from "@/database/schemas/schema-role-permission";
import type {
    AssignPermissionToRoleInput,
    AssignPermissionToUserInput,
    AssignRoleToUserInput,
    CreatePermissionInput,
    CreateRoleInput,
    UpdatePermissionInput,
    UpdateRoleInput,
    UserRolesAndPermissions,
} from "@/interface/role-permission.interface";
import type { ServiceResponse } from "@/entities/Service";
import { 
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE, 
    INVALID_ID_SERVICE_RESPONSE 
} from "@/entities/Service";

export class RolePermissionService {
    /**
     * Role
     */
    static async createRole(data: CreateRoleInput): Promise<ServiceResponse<InferSelectModel<typeof roleTable>>> {
        try {
            const [role] = await db
                .insert(roleTable)
                .values({
                    name: data.name,
                    description: data.description || null,
                })
                .returning();

            return {
                status: true,
                data: role,
            };
        } catch (err) {
            console.error(`RolePermissionService.createRole: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async updateRole(roleId: string, data: UpdateRoleInput): Promise<ServiceResponse<InferSelectModel<typeof roleTable>>> {
        try {
            const [role] = await db
                .update(roleTable)
                .set({
                    name: data.name,
                    description: data.description,
                })
                .where(eq(roleTable.id, roleId))
                .returning();

            if (!role) return INVALID_ID_SERVICE_RESPONSE;

            return {
                status: true,
                data: role,
            };
        } catch (err) {
            console.error(`RolePermissionService.updateRole: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async deleteRole(roleId: string): Promise<ServiceResponse<{ deletedCount: number }>> {
        try {
            await db.delete(roleTable).where(eq(roleTable.id, roleId));

            return {
                status: true,
                data: { deletedCount: 1 },
            };
        } catch (err) {
            console.error(`RolePermissionService.deleteRole: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async getAllRole(): Promise<ServiceResponse<InferSelectModel<typeof roleTable>[]>> {
        try {
            const roles = await db.select().from(roleTable);

            return {
                status: true,
                data: roles,
            };
        } catch (err) {
            console.error(`RolePermissionService.getAllRole: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async getRoleById(roleId: string): Promise<ServiceResponse<InferSelectModel<typeof roleTable>>> {
        try {
            const [role] = await db.select().from(roleTable).where(eq(roleTable.id, roleId)).limit(1);

            if (!role) return INVALID_ID_SERVICE_RESPONSE;

            return {
                status: true,
                data: role,
            };
        } catch (err) {
            console.error(`RolePermissionService.getRoleById: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    /**
     * Permission
     */
    static async createPermission(data: CreatePermissionInput): Promise<ServiceResponse<InferSelectModel<typeof permissionTable>>> {
        try {
            const [permission] = await db
                .insert(permissionTable)
                .values({
                    name: data.name,
                    description: data.description || null,
                })
                .returning();

            return {
                status: true,
                data: permission,
            };
        } catch (err) {
            console.error(`RolePermissionService.createPermission: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async updatePermission(
        permissionId: string,
        data: UpdatePermissionInput
    ): Promise<ServiceResponse<InferSelectModel<typeof permissionTable>>> {
        try {
            const [permission] = await db
                .update(permissionTable)
                .set({
                    name: data.name,
                    description: data.description,
                })
                .where(eq(permissionTable.id, permissionId))
                .returning();

            if (!permission) return INVALID_ID_SERVICE_RESPONSE;

            return {
                status: true,
                data: permission,
            };
        } catch (err) {
            console.error(`RolePermissionService.updatePermission: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async deletePermission(permissionId: string): Promise<ServiceResponse<{ deletedCount: number }>> {
        try {
            await db.delete(permissionTable).where(eq(permissionTable.id, permissionId));

            return {
                status: true,
                data: { deletedCount: 1 },
            };
        } catch (err) {
            console.error(`RolePermissionService.deletePermission: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async getAllPermission(): Promise<ServiceResponse<InferSelectModel<typeof permissionTable>[]>> {
        try {
            const permissions = await db.select().from(permissionTable);

            return {
                status: true,
                data: permissions,
            };
        } catch (err) {
            console.error(`RolePermissionService.getAllPermission: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async getPermissionById(permissionId: string): Promise<ServiceResponse<InferSelectModel<typeof permissionTable>>> {
        try {
            const [permission] = await db
                .select()
                .from(permissionTable)
                .where(eq(permissionTable.id, permissionId))
                .limit(1);

            if (!permission) return INVALID_ID_SERVICE_RESPONSE;

            return {
                status: true,
                data: permission,
            };
        } catch (err) {
            console.error(`RolePermissionService.getPermissionById: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    /**
     * Role <-> Permission
     */
    static async assignPermissionToRole(data: AssignPermissionToRoleInput): Promise<ServiceResponse<{ success: boolean }>> {
        try {
            await db.insert(rolePermissionTable).values({
                id_role: data.roleId,
                id_permission: data.permissionId,
            });

            return {
                status: true,
                data: { success: true },
            };
        } catch (err) {
            console.error(`RolePermissionService.assignPermissionToRole: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async removePermissionFromRole(data: AssignPermissionToRoleInput): Promise<ServiceResponse<{ success: boolean }>> {
        try {
            await db
                .delete(rolePermissionTable)
                .where(
                    and(
                        eq(rolePermissionTable.id_role, data.roleId),
                        eq(rolePermissionTable.id_permission, data.permissionId)
                    )
                );

            return {
                status: true,
                data: { success: true },
            };
        } catch (err) {
            console.error(`RolePermissionService.removePermissionFromRole: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async getRolePermissions(roleId: string): Promise<ServiceResponse<InferSelectModel<typeof permissionTable>[]>> {
        try {
            const result = await db
                .select({
                    id: permissionTable.id,
                    name: permissionTable.name,
                    description: permissionTable.description,
                })
                .from(rolePermissionTable)
                .innerJoin(permissionTable, eq(rolePermissionTable.id_permission, permissionTable.id))
                .where(eq(rolePermissionTable.id_role, roleId));

            return {
                status: true,
                data: result as any,
            };
        } catch (err) {
            console.error(`RolePermissionService.getRolePermissions: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    /**
     * Role <-> User
     */
    static async assignRoleToUser(data: AssignRoleToUserInput): Promise<ServiceResponse<{ success: boolean }>> {
        try {
            await db.insert(userRoleTable).values({
                id_user: data.userId,
                id_role: data.roleId,
            });

            return {
                status: true,
                data: { success: true },
            };
        } catch (err) {
            console.error(`RolePermissionService.assignRoleToUser: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async removeRoleFromUser(data: AssignRoleToUserInput): Promise<ServiceResponse<{ success: boolean }>> {
        try {
            await db
                .delete(userRoleTable)
                .where(and(eq(userRoleTable.id_user, data.userId), eq(userRoleTable.id_role, data.roleId)));

            return {
                status: true,
                data: { success: true },
            };
        } catch (err) {
            console.error(`RolePermissionService.removeRoleFromUser: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    /**
     * Permission <-> User
     */
    static async assignPermissionToUser(data: AssignPermissionToUserInput): Promise<ServiceResponse<{ success: boolean }>> {
        try {
            await db.insert(userPermissionTable).values({
                id_user: data.userId,
                id_permission: data.permissionId,
            });

            return {
                status: true,
                data: { success: true },
            };
        } catch (err) {
            console.error(`RolePermissionService.assignPermissionToUser: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async removePermissionFromUser(data: AssignPermissionToUserInput): Promise<ServiceResponse<{ success: boolean }>> {
        try {
            await db
                .delete(userPermissionTable)
                .where(
                    and(
                        eq(userPermissionTable.id_user, data.userId),
                        eq(userPermissionTable.id_permission, data.permissionId)
                    )
                );

            return {
                status: true,
                data: { success: true },
            };
        } catch (err) {
            console.error(`RolePermissionService.removePermissionFromUser: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    /**
     * User Role & Permission
     */
    static async getUserRolesAndPermissions(userId: string): Promise<UserRolesAndPermissions> {
        // NOTE: This method is kept synchronous without ServiceResponse wrapper
        // because it's used internally by UserService.attachRolesAndPermissions
        // and changing it would break existing code flow
        
        // Get user roles
        const userRoles = await db
            .select({
                name: roleTable.name,
            })
            .from(userRoleTable)
            .innerJoin(roleTable, eq(userRoleTable.id_role, roleTable.id))
            .where(eq(userRoleTable.id_user, userId));

        // Get permissions from roles
        const roleIds = await db
            .select({
                id_role: userRoleTable.id_role,
            })
            .from(userRoleTable)
            .where(eq(userRoleTable.id_user, userId));

        let rolePermissions: { name: string }[] = [];

        if (roleIds.length > 0) {
            rolePermissions = await db
                .select({
                    name: permissionTable.name,
                })
                .from(rolePermissionTable)
                .innerJoin(permissionTable, eq(rolePermissionTable.id_permission, permissionTable.id))
                .where(
                    inArray(
                        rolePermissionTable.id_role,
                        roleIds.map((r) => r.id_role)
                    )
                );
        }

        // Get direct user permissions
        const directPermissions = await db
            .select({
                name: permissionTable.name,
            })
            .from(userPermissionTable)
            .innerJoin(permissionTable, eq(userPermissionTable.id_permission, permissionTable.id))
            .where(eq(userPermissionTable.id_user, userId));

        // Merge and deduplicate permissions
        const permissionSet = new Set<string>();

        for (const perm of rolePermissions) {
            permissionSet.add(perm.name);
        }

        for (const perm of directPermissions) {
            permissionSet.add(perm.name);
        }

        return {
            roles: userRoles.map((r) => r.name),
            permissions: Array.from(permissionSet),
        };
    }

    /**
     * Helper to check Role & Permission
     */
    static async userHasPermission(userId: string, permissionName: string): Promise<boolean> {
        const { permissions } = await RolePermissionService.getUserRolesAndPermissions(userId);

        return permissions.includes(permissionName);
    }

    static async userHasRole(userId: string, roleName: string): Promise<boolean> {
        const { roles } = await RolePermissionService.getUserRolesAndPermissions(userId);

        return roles.includes(roleName);
    }
}
