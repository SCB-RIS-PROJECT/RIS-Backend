import { createMiddleware } from "hono/factory";
import * as HttpStatusCodes from "stoker/http-status-codes";
import type { AppBindings } from "@/interface";
import { RolePermissionService } from "@/service/role-permission.service";

/**
 * Middleware to check if user has required permission
 * @param permission - Permission name to check (e.g., "read:user", "create:post")
 * @returns Middleware function
 * @example
 * router.get("/users", permissionMiddleware("read:user"), handler);
 */
export const permissionMiddleware = (permission: string) => {
    return createMiddleware<AppBindings>(async (c, next) => {
        const user = c.get("user");
        const userId = user?.id;

        if (!userId) {
            return c.json(
                {
                    message: "Not authenticated",
                },
                HttpStatusCodes.UNAUTHORIZED
            );
        }

        const hasPermission = await RolePermissionService.userHasPermission(userId, permission);

        if (!hasPermission) {
            return c.json(
                {
                    message: `Permission denied. Required permission: ${permission}`,
                },
                HttpStatusCodes.FORBIDDEN
            );
        }

        await next();
    });
};

/**
 * Middleware to check if user has required role
 * @param role - Role name to check (e.g., "admin", "moderator")
 * @returns Middleware function
 * @example
 * router.delete("/users/:id", roleMiddleware("admin"), handler);
 */
export const roleMiddleware = (role: string) => {
    return createMiddleware<AppBindings>(async (c, next) => {
        const user = c.get("user");
        const userId = user?.id;

        if (!userId) {
            return c.json(
                {
                    message: "Not authenticated",
                },
                HttpStatusCodes.UNAUTHORIZED
            );
        }

        const hasRole = await RolePermissionService.userHasRole(userId, role);

        if (!hasRole) {
            return c.json(
                {
                    message: `Access denied. Required role: ${role}`,
                },
                HttpStatusCodes.FORBIDDEN
            );
        }

        await next();
    });
};

/**
 * Middleware to check if user has ANY of the required permissions
 * @param permissions - Array of permission names
 * @returns Middleware function
 * @example
 * router.get("/posts", permissionAnyMiddleware(["read:post", "read:all"]), handler);
 */
export const permissionAnyMiddleware = (permissions: string[]) => {
    return createMiddleware<AppBindings>(async (c, next) => {
        const user = c.get("user");
        const userId = user?.id;

        if (!userId) {
            return c.json(
                {
                    message: "Not authenticated",
                },
                HttpStatusCodes.UNAUTHORIZED
            );
        }

        const userRolesAndPermissions = await RolePermissionService.getUserRolesAndPermissions(userId);
        const hasAnyPermission = permissions.some((perm) => userRolesAndPermissions.permissions.includes(perm));

        if (!hasAnyPermission) {
            return c.json(
                {
                    message: `Permission denied. Required any of: ${permissions.join(", ")}`,
                },
                HttpStatusCodes.FORBIDDEN
            );
        }

        await next();
    });
};

/**
 * Middleware to check if user has ALL of the required permissions
 * @param permissions - Array of permission names
 * @returns Middleware function
 * @example
 * router.post("/admin/settings", permissionAllMiddleware(["write:settings", "admin:access"]), handler);
 */
export const permissionAllMiddleware = (permissions: string[]) => {
    return createMiddleware<AppBindings>(async (c, next) => {
        const user = c.get("user");
        const userId = user?.id;

        if (!userId) {
            return c.json(
                {
                    message: "Not authenticated",
                },
                HttpStatusCodes.UNAUTHORIZED
            );
        }

        const userRolesAndPermissions = await RolePermissionService.getUserRolesAndPermissions(userId);
        const hasAllPermissions = permissions.every((perm) => userRolesAndPermissions.permissions.includes(perm));

        if (!hasAllPermissions) {
            return c.json(
                {
                    message: `Permission denied. Required all of: ${permissions.join(", ")}`,
                },
                HttpStatusCodes.FORBIDDEN
            );
        }

        await next();
    });
};
