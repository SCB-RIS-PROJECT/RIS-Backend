import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCode from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";
import createRouter from "@/config/create-router";
import { loggerPino } from "@/config/log";
import {
    createProfileSchema,
    profileApiResponseSchema,
    profileErrorResponseSchema,
    profileIdParamSchema,    profilePaginationApiResponseSchema,    profilePaginationResponseSchema,
    profileQuerySchema,
    profileResponseSchema,
    updateProfileSchema,
} from "@/interface/profile-medical.interface";
import { authMiddleware } from "@/middleware/auth.middleware";
import { permissionMiddleware } from "@/middleware/role-permission.middleware";
import { ProfileService } from "@/service/profile-medical.service";
import {
    response_success,
    response_created,
    handleServiceErrorWithResponse,
} from "@/utils/response.utils";

const tags = ["Profile"];

// GET /api/profiles - Get all profiles
const getAllProfiles = createRoute({
    path: "/api/profiles",
    method: "get",
    tags,
    summary: "Get all profiles",
    middleware: [authMiddleware, permissionMiddleware("read:profile")] as const,
    request: {
        query: profileQuerySchema,
    },
    responses: {
        [HttpStatusCode.OK]: jsonContent(profilePaginationApiResponseSchema, "Profiles retrieved successfully"),
        [HttpStatusCode.UNAUTHORIZED]: jsonContent(createErrorSchema(profileQuerySchema), "Unauthorized"),
        [HttpStatusCode.FORBIDDEN]: jsonContent(createErrorSchema(profileQuerySchema), "Forbidden"),
    },
});

// GET /api/profiles/:id - Get profile by ID
const getProfileById = createRoute({
    path: "/api/profiles/{id}",
    method: "get",
    tags,
    summary: "Get profile by ID",
    middleware: [authMiddleware, permissionMiddleware("read:profile")] as const,
    request: {
        params: profileIdParamSchema,
    },
    responses: {
        [HttpStatusCode.OK]: jsonContent(profileApiResponseSchema, "Profile retrieved successfully"),
        [HttpStatusCode.NOT_FOUND]: jsonContent(profileErrorResponseSchema, "Not found"),
        [HttpStatusCode.UNAUTHORIZED]: jsonContent(createErrorSchema(profileIdParamSchema), "Unauthorized"),
        [HttpStatusCode.FORBIDDEN]: jsonContent(createErrorSchema(profileIdParamSchema), "Forbidden"),
    },
});

// POST /api/profiles - Create profile
const createProfile = createRoute({
    path: "/api/profiles",
    method: "post",
    tags,
    summary: "Create new profile",
    middleware: [authMiddleware, permissionMiddleware("create:profile")] as const,
    request: {
        body: jsonContentRequired(createProfileSchema, "Profile data"),
    },
    responses: {
        [HttpStatusCode.CREATED]: jsonContent(profileApiResponseSchema, "Profile created successfully"),
        [HttpStatusCode.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(createProfileSchema),
            "Validation error"
        ),
        [HttpStatusCode.UNAUTHORIZED]: jsonContent(createErrorSchema(createProfileSchema), "Unauthorized"),
        [HttpStatusCode.FORBIDDEN]: jsonContent(createErrorSchema(createProfileSchema), "Forbidden"),
    },
});

// PATCH /api/profiles/:id - Update profile
const updateProfile = createRoute({
    path: "/api/profiles/{id}",
    method: "patch",
    tags,
    summary: "Update profile",
    middleware: [authMiddleware, permissionMiddleware("update:profile")] as const,
    request: {
        params: profileIdParamSchema,
        body: jsonContentRequired(updateProfileSchema, "Profile update data"),
    },
    responses: {
        [HttpStatusCode.OK]: jsonContent(profileApiResponseSchema, "Profile updated successfully"),
        [HttpStatusCode.NOT_FOUND]: jsonContent(profileErrorResponseSchema, "Not found"),
        [HttpStatusCode.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(updateProfileSchema),
            "Validation error"
        ),
        [HttpStatusCode.UNAUTHORIZED]: jsonContent(createErrorSchema(profileIdParamSchema), "Unauthorized"),
        [HttpStatusCode.FORBIDDEN]: jsonContent(createErrorSchema(profileIdParamSchema), "Forbidden"),
    },
});

// DELETE /api/profiles/:id - Delete profile
const deleteProfile = createRoute({
    path: "/api/profiles/{id}",
    method: "delete",
    tags,
    summary: "Delete profile",
    middleware: [authMiddleware, permissionMiddleware("delete:profile")] as const,
    request: {
        params: profileIdParamSchema,
    },
    responses: {
        [HttpStatusCode.OK]: jsonContent(createMessageObjectSchema("Profile deleted successfully"), "Deleted"),
        [HttpStatusCode.NOT_FOUND]: jsonContent(createMessageObjectSchema("Profile not found"), "Not found"),
        [HttpStatusCode.UNAUTHORIZED]: jsonContent(createErrorSchema(profileIdParamSchema), "Unauthorized"),
        [HttpStatusCode.FORBIDDEN]: jsonContent(createErrorSchema(profileIdParamSchema), "Forbidden"),
    },
});

// Create router and register routes
const profileController = createRouter()
    .openapi(getAllProfiles, async (c) => {
        const query = c.req.valid("query");
        const serviceResponse = await ProfileService.getAllProfiles(query);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        loggerPino.debug(serviceResponse.data);
        return response_success(c, serviceResponse.data, "Successfully fetched all Profiles!");
    })
    .openapi(getProfileById, async (c) => {
        const { id } = c.req.valid("param");
        const serviceResponse = await ProfileService.getProfileById(id);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        if (serviceResponse.data) {
            loggerPino.debug(serviceResponse.data.name);
        }
        return response_success(c, serviceResponse.data, "Successfully fetched Profile!");
    })
    .openapi(createProfile, async (c) => {
        const data = c.req.valid("json");
        const serviceResponse = await ProfileService.createProfile(data);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        if (serviceResponse.data) {
            loggerPino.debug(serviceResponse.data.name);
        }
        return response_created(c, serviceResponse.data, "Successfully created Profile!");
    })
    .openapi(updateProfile, async (c) => {
        const { id } = c.req.valid("param");
        const data = c.req.valid("json");
        const serviceResponse = await ProfileService.updateProfile(id, data);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        if (serviceResponse.data) {
            loggerPino.debug(serviceResponse.data.name);
        }
        return response_success(c, serviceResponse.data, "Successfully updated Profile!");
    })
    .openapi(deleteProfile, async (c) => {
        const { id } = c.req.valid("param");
        const serviceResponse = await ProfileService.deleteProfile(id);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        loggerPino.debug({ message: "Profile deleted successfully" });
        return response_success(c, serviceResponse.data, "Successfully deleted Profile!");
    });

export default profileController;
