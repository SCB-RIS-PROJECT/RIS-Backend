import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";
import createRouter from "@/config/create-router";
import {
    assignPermissionToRoleSchema,
    assignPermissionToUserSchema,
    assignRoleToUserSchema,
    permissionIdParamSchema,
    permissionResponseSchema,
    revokePermissionSchema,
    roleIdParamSchema,
    roleResponseSchema,
    roleWithPermissionsSchema,
    userIdParamSchema,
    userPermissionsResponseSchema,
} from "@/interface/permission.interface";
import { authMiddleware } from "@/middleware/auth.middleware";
import { permissionMiddleware } from "@/middleware/role-permission.middleware";
import { PermissionService } from "@/service/permission.service";
import { handleServiceErrorWithResponse, response_success } from "@/utils/response.utils";

const permissionController = createRouter();

const tags = ["Permission Management"];

// ==================== GET ALL PERMISSIONS ====================
permissionController.openapi(
    createRoute({
        tags,
        method: "get",
        path: "/api/permissions",
        summary: "Get all permissions",
        description: "Get list of all available permissions in the system",
        middleware: [authMiddleware, permissionMiddleware("read:permission")] as const,
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                z.object({
                    content: z.object({
                        data: z.array(permissionResponseSchema),
                    }),
                    message: z.string(),
                    errors: z.array(z.unknown()),
                }),
                "Permissions retrieved successfully"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
        },
    }),
    async (c) => {
        const serviceResponse = await PermissionService.getAllPermissions();

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully retrieved permissions");
    }
);

// ==================== GET ALL ROLES ====================
permissionController.openapi(
    createRoute({
        tags,
        method: "get",
        path: "/api/roles",
        summary: "Get all roles",
        description: "Get list of all available roles in the system",
        middleware: [authMiddleware, permissionMiddleware("read:permission")] as const,
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                z.object({
                    content: z.object({
                        data: z.array(roleResponseSchema),
                    }),
                    message: z.string(),
                    errors: z.array(z.unknown()),
                }),
                "Roles retrieved successfully"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
        },
    }),
    async (c) => {
        const serviceResponse = await PermissionService.getAllRoles();

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully retrieved roles");
    }
);

// ==================== GET ROLE WITH PERMISSIONS ====================
permissionController.openapi(
    createRoute({
        tags,
        method: "get",
        path: "/api/roles/{roleId}",
        summary: "Get role with permissions",
        description: "Get a specific role with all its assigned permissions",
        middleware: [authMiddleware, permissionMiddleware("read:permission")] as const,
        request: {
            params: roleIdParamSchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                z.object({
                    content: z.object({
                        data: roleWithPermissionsSchema,
                    }),
                    message: z.string(),
                    errors: z.array(z.unknown()),
                }),
                "Role retrieved successfully"
            ),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema("Role not found"), "Role not found"),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
        },
    }),
    async (c) => {
        const { roleId } = c.req.valid("param");
        const serviceResponse = await PermissionService.getRoleWithPermissions(roleId);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully retrieved role");
    }
);

// ==================== GET USER PERMISSIONS ====================
permissionController.openapi(
    createRoute({
        tags,
        method: "get",
        path: "/api/users/{userId}/permissions",
        summary: "Get user permissions",
        description: "Get all permissions for a user (from roles + direct permissions)",
        middleware: [authMiddleware, permissionMiddleware("read:permission")] as const,
        request: {
            params: userIdParamSchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                z.object({
                    content: z.object({
                        data: userPermissionsResponseSchema,
                    }),
                    message: z.string(),
                    errors: z.array(z.unknown()),
                }),
                "User permissions retrieved successfully"
            ),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema("User not found"), "User not found"),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
        },
    }),
    async (c) => {
        const { userId } = c.req.valid("param");
        const serviceResponse = await PermissionService.getUserPermissions(userId);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully retrieved user permissions");
    }
);

// ==================== ASSIGN PERMISSIONS TO ROLE ====================
permissionController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/roles/{roleId}/permissions",
        summary: "Assign permissions to role",
        description: "Assign one or more permissions to a role",
        middleware: [authMiddleware, permissionMiddleware("write:permission")] as const,
        request: {
            params: roleIdParamSchema,
            body: jsonContentRequired(assignPermissionToRoleSchema, "Permission IDs to assign"),
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                z.object({
                    content: z.object({
                        data: z.object({
                            message: z.string(),
                        }),
                    }),
                    message: z.string(),
                    errors: z.array(z.unknown()),
                }),
                "Permissions assigned successfully"
            ),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema("Role not found"), "Role not found"),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(
                createErrorSchema(assignPermissionToRoleSchema),
                "Invalid request body"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
        },
    }),
    async (c) => {
        const { roleId } = c.req.valid("param");
        const data = c.req.valid("json");

        const serviceResponse = await PermissionService.assignPermissionsToRole(roleId, data);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully assigned permissions to role");
    }
);

// ==================== REVOKE PERMISSIONS FROM ROLE ====================
permissionController.openapi(
    createRoute({
        tags,
        method: "delete",
        path: "/api/roles/{roleId}/permissions",
        summary: "Revoke permissions from role",
        description: "Revoke one or more permissions from a role",
        middleware: [authMiddleware, permissionMiddleware("write:permission")] as const,
        request: {
            params: roleIdParamSchema,
            body: jsonContentRequired(revokePermissionSchema, "Permission IDs to revoke"),
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                z.object({
                    content: z.object({
                        data: z.object({
                            message: z.string(),
                        }),
                    }),
                    message: z.string(),
                    errors: z.array(z.unknown()),
                }),
                "Permissions revoked successfully"
            ),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema("Role not found"), "Role not found"),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(
                createErrorSchema(revokePermissionSchema),
                "Invalid request body"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
        },
    }),
    async (c) => {
        const { roleId } = c.req.valid("param");
        const data = c.req.valid("json");

        const serviceResponse = await PermissionService.revokePermissionsFromRole(roleId, data.permission_ids);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully revoked permissions from role");
    }
);

// ==================== ASSIGN PERMISSIONS TO USER ====================
permissionController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/users/{userId}/permissions",
        summary: "Assign permissions to user",
        description: "Assign permissions directly to a user (not through roles)",
        middleware: [authMiddleware, permissionMiddleware("write:permission")] as const,
        request: {
            params: userIdParamSchema,
            body: jsonContentRequired(assignPermissionToUserSchema, "Permission IDs to assign"),
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                z.object({
                    content: z.object({
                        data: z.object({
                            message: z.string(),
                        }),
                    }),
                    message: z.string(),
                    errors: z.array(z.unknown()),
                }),
                "Permissions assigned successfully"
            ),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema("User not found"), "User not found"),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(
                createErrorSchema(assignPermissionToUserSchema),
                "Invalid request body"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
        },
    }),
    async (c) => {
        const { userId } = c.req.valid("param");
        const data = c.req.valid("json");

        const serviceResponse = await PermissionService.assignPermissionsToUser(userId, data);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully assigned permissions to user");
    }
);

// ==================== REVOKE PERMISSIONS FROM USER ====================
permissionController.openapi(
    createRoute({
        tags,
        method: "delete",
        path: "/api/users/{userId}/permissions",
        summary: "Revoke permissions from user",
        description: "Revoke direct permissions from a user",
        middleware: [authMiddleware, permissionMiddleware("write:permission")] as const,
        request: {
            params: userIdParamSchema,
            body: jsonContentRequired(revokePermissionSchema, "Permission IDs to revoke"),
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                z.object({
                    content: z.object({
                        data: z.object({
                            message: z.string(),
                        }),
                    }),
                    message: z.string(),
                    errors: z.array(z.unknown()),
                }),
                "Permissions revoked successfully"
            ),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema("User not found"), "User not found"),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(
                createErrorSchema(revokePermissionSchema),
                "Invalid request body"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
        },
    }),
    async (c) => {
        const { userId } = c.req.valid("param");
        const data = c.req.valid("json");

        const serviceResponse = await PermissionService.revokePermissionsFromUser(userId, data.permission_ids);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully revoked permissions from user");
    }
);

// ==================== ASSIGN ROLES TO USER ====================
permissionController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/users/{userId}/roles",
        summary: "Assign roles to user",
        description: "Assign one or more roles to a user",
        middleware: [authMiddleware, permissionMiddleware("write:permission")] as const,
        request: {
            params: userIdParamSchema,
            body: jsonContentRequired(assignRoleToUserSchema, "Role IDs to assign"),
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                z.object({
                    content: z.object({
                        data: z.object({
                            message: z.string(),
                        }),
                    }),
                    message: z.string(),
                    errors: z.array(z.unknown()),
                }),
                "Roles assigned successfully"
            ),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema("User not found"), "User not found"),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(
                createErrorSchema(assignRoleToUserSchema),
                "Invalid request body"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
        },
    }),
    async (c) => {
        const { userId } = c.req.valid("param");
        const data = c.req.valid("json");

        const serviceResponse = await PermissionService.assignRolesToUser(userId, data);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully assigned roles to user");
    }
);

// ==================== REVOKE ROLES FROM USER ====================
permissionController.openapi(
    createRoute({
        tags,
        method: "delete",
        path: "/api/users/{userId}/roles",
        summary: "Revoke roles from user",
        description: "Revoke one or more roles from a user",
        middleware: [authMiddleware, permissionMiddleware("write:permission")] as const,
        request: {
            params: userIdParamSchema,
            body: jsonContentRequired(
                z.object({
                    role_ids: z.array(z.string().uuid()).min(1, "At least one role is required"),
                }),
                "Role IDs to revoke"
            ),
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                z.object({
                    content: z.object({
                        data: z.object({
                            message: z.string(),
                        }),
                    }),
                    message: z.string(),
                    errors: z.array(z.unknown()),
                }),
                "Roles revoked successfully"
            ),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema("User not found"), "User not found"),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
        },
    }),
    async (c) => {
        const { userId } = c.req.valid("param");
        const data = c.req.valid("json");

        const serviceResponse = await PermissionService.revokeRolesFromUser(userId, data.role_ids);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully revoked roles from user");
    }
);

export default permissionController;
