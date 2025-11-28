import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";
import createRouter from "@/config/create-router";
import { loggerPino } from "@/config/log";
import {
    createModalitySchema,
    modalityIdParamSchema,
    modalityPaginationResponseSchema,
    modalityQuerySchema,
    modalityResponseSchema,
    updateModalitySchema,
} from "@/interface/modality.interface";
import { authMiddleware } from "@/middleware/auth.middleware";
import { permissionMiddleware } from "@/middleware/role-permission.middleware";
import { ModalityService } from "@/service/modality.service";

const modalityController = createRouter();

const tags = ["Modality"];

// Get all modalities with pagination and search
modalityController.openapi(
    createRoute({
        tags,
        method: "get",
        path: "/api/modalities",
        summary: "Get all modalities",
        description: "Get paginated list of modalities with optional search by code or name",
        middleware: [authMiddleware, permissionMiddleware("read:modality")] as const,
        request: {
            query: modalityQuerySchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(modalityPaginationResponseSchema, "Modalities retrieved successfully"),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(
                createErrorSchema(modalityQuerySchema),
                "Invalid query parameters"
            ),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                createMessageObjectSchema("Failed to fetch modalities"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const query = c.req.valid("query");

            const data = await ModalityService.getAllModalities(query);

            return c.json(data, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to fetch modalities" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

// Get modality by ID
modalityController.openapi(
    createRoute({
        tags,
        method: "get",
        path: "/api/modalities/{id}",
        summary: "Get modality by ID",
        description: "Get a single modality by its ID",
        middleware: [authMiddleware, permissionMiddleware("read:modality")] as const,
        request: {
            params: modalityIdParamSchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(modalityResponseSchema, "Modality retrieved successfully"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("Modality not found"),
                "Modality not found"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                createMessageObjectSchema("Failed to fetch modality"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const { id } = c.req.valid("param");

            const modality = await ModalityService.getModalityById(id);

            if (!modality) {
                return c.json({ message: "Modality not found" }, HttpStatusCodes.NOT_FOUND);
            }

            return c.json(modality, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to fetch modality" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

// Create new modality
modalityController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/modalities",
        summary: "Create new modality",
        description: "Create a new modality",
        middleware: [authMiddleware, permissionMiddleware("create:modality")] as const,
        request: {
            body: jsonContent(createModalitySchema, "Modality data to create"),
        },
        responses: {
            [HttpStatusCodes.CREATED]: jsonContent(modalityResponseSchema, "Modality created successfully"),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(createErrorSchema(createModalitySchema), "Invalid input data"),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                createMessageObjectSchema("Failed to create modality"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const data = c.req.valid("json");

            const modality = await ModalityService.createModality(data);

            return c.json(modality, HttpStatusCodes.CREATED);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to create modality" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

// Update modality
modalityController.openapi(
    createRoute({
        tags,
        method: "patch",
        path: "/api/modalities/{id}",
        summary: "Update modality",
        description: "Update an existing modality",
        middleware: [authMiddleware, permissionMiddleware("update:modality")] as const,
        request: {
            params: modalityIdParamSchema,
            body: jsonContent(updateModalitySchema, "Modality data to update"),
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(modalityResponseSchema, "Modality updated successfully"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("Modality not found"),
                "Modality not found"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(createErrorSchema(updateModalitySchema), "Invalid input data"),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                createMessageObjectSchema("Failed to update modality"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const { id } = c.req.valid("param");
            const data = c.req.valid("json");

            const modality = await ModalityService.updateModality(id, data);

            if (!modality) {
                return c.json({ message: "Modality not found" }, HttpStatusCodes.NOT_FOUND);
            }

            return c.json(modality, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to update modality" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

// Delete modality
modalityController.openapi(
    createRoute({
        tags,
        method: "delete",
        path: "/api/modalities/{id}",
        summary: "Delete modality",
        description: "Delete a modality",
        middleware: [authMiddleware, permissionMiddleware("delete:modality")] as const,
        request: {
            params: modalityIdParamSchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                createMessageObjectSchema("Modality deleted successfully"),
                "Modality deleted"
            ),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("Modality not found"),
                "Modality not found"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                createMessageObjectSchema("Failed to delete modality"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const { id } = c.req.valid("param");

            const deleted = await ModalityService.deleteModality(id);

            if (!deleted) {
                return c.json({ message: "Modality not found" }, HttpStatusCodes.NOT_FOUND);
            }

            return c.json({ message: "Modality deleted successfully" }, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to delete modality" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

export default modalityController;
