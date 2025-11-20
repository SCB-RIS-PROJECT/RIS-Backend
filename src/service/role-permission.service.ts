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

export class RolePermissionService {
    /**
     * Role
     */
    static async createRole(data: CreateRoleInput): Promise<InferSelectModel<typeof roleTable>> {
        const [role] = await db
            .insert(roleTable)
            .values({
                name: data.name,
                description: data.description || null,
            })
            .returning();

        return role;
    }

    static async updateRole(roleId: string, data: UpdateRoleInput): Promise<InferSelectModel<typeof roleTable> | null> {
        const [role] = await db
            .update(roleTable)
            .set({
                name: data.name,
                description: data.description,
            })
            .where(eq(roleTable.id, roleId))
            .returning();

        return role ?? null;
    }

    static async deleteRole(roleId: string): Promise<void> {
        await db.delete(roleTable).where(eq(roleTable.id, roleId));
    }

    static async getAllRole(): Promise<InferSelectModel<typeof roleTable>[]> {
        return await db.select().from(roleTable);
    }

    static async getRoleById(roleId: string): Promise<InferSelectModel<typeof roleTable> | null> {
        const [role] = await db.select().from(roleTable).where(eq(roleTable.id, roleId)).limit(1);

        return role ?? null;
    }

    /**
     * Permission
     */
    static async createPermission(data: CreatePermissionInput): Promise<InferSelectModel<typeof permissionTable>> {
        const [permission] = await db
            .insert(permissionTable)
            .values({
                name: data.name,
                description: data.description || null,
            })
            .returning();

        return permission;
    }

    static async updatePermission(
        permissionId: string,
        data: UpdatePermissionInput
    ): Promise<InferSelectModel<typeof permissionTable> | null> {
        const [permission] = await db
            .update(permissionTable)
            .set({
                name: data.name,
                description: data.description,
            })
            .where(eq(permissionTable.id, permissionId))
            .returning();

        return permission ?? null;
    }

    static async deletePermission(permissionId: string): Promise<void> {
        await db.delete(permissionTable).where(eq(permissionTable.id, permissionId));
    }

    static async getAllPermission(): Promise<InferSelectModel<typeof permissionTable>[]> {
        return await db.select().from(permissionTable);
    }

    static async getPermissionById(permissionId: string): Promise<InferSelectModel<typeof permissionTable> | null> {
        const [permission] = await db
            .select()
            .from(permissionTable)
            .where(eq(permissionTable.id, permissionId))
            .limit(1);

        return permission ?? null;
    }

    /**
     * Role <-> Permission
     */
    static async assignPermissionToRole(data: AssignPermissionToRoleInput): Promise<void> {
        await db.insert(rolePermissionTable).values({
            id_role: data.roleId,
            id_permission: data.permissionId,
        });
    }

    static async removePermissionFromRole(data: AssignPermissionToRoleInput): Promise<void> {
        await db
            .delete(rolePermissionTable)
            .where(
                and(
                    eq(rolePermissionTable.id_role, data.roleId),
                    eq(rolePermissionTable.id_permission, data.permissionId)
                )
            );
    }

    static async getRolePermissions(roleId: string): Promise<InferSelectModel<typeof permissionTable>[]> {
        const result = await db
            .select({
                id: permissionTable.id,
                name: permissionTable.name,
                description: permissionTable.description,
            })
            .from(rolePermissionTable)
            .innerJoin(permissionTable, eq(rolePermissionTable.id_permission, permissionTable.id))
            .where(eq(rolePermissionTable.id_role, roleId));

        return result;
    }

    /**
     * Role <-> User
     */
    static async assignRoleToUser(data: AssignRoleToUserInput): Promise<void> {
        await db.insert(userRoleTable).values({
            id_user: data.userId,
            id_role: data.roleId,
        });
    }

    static async removeRoleFromUser(data: AssignRoleToUserInput): Promise<void> {
        await db
            .delete(userRoleTable)
            .where(and(eq(userRoleTable.id_user, data.userId), eq(userRoleTable.id_role, data.roleId)));
    }

    /**
     * Permission <-> User
     */
    static async assignPermissionToUser(data: AssignPermissionToUserInput): Promise<void> {
        await db.insert(userPermissionTable).values({
            id_user: data.userId,
            id_permission: data.permissionId,
        });
    }

    static async removePermissionFromUser(data: AssignPermissionToUserInput): Promise<void> {
        await db
            .delete(userPermissionTable)
            .where(
                and(
                    eq(userPermissionTable.id_user, data.userId),
                    eq(userPermissionTable.id_permission, data.permissionId)
                )
            );
    }

    /**
     * User Role & Permission
     */
    static async getUserRolesAndPermissions(userId: string): Promise<UserRolesAndPermissions> {
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
