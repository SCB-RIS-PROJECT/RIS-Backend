import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";
import createRouter from "@/config/create-router";
import { loggerPino } from "@/config/log";
import {
    createLoincSchema,
    loincIdParamSchema,
    loincPaginationResponseSchema,
    loincQuerySchema,
    loincResponseSchema,
    updateLoincSchema,
} from "@/interface/loinc.interface";
import { authMiddleware } from "@/middleware/auth.middleware";
import { permissionMiddleware } from "@/middleware/role-permission.middleware";
import { LoincService } from "@/service/loinc.service";

const loincController = createRouter();

const tags = ["LOINC"];

// Get all LOINC codes with pagination and search
loincController.openapi(
    createRoute({
        tags,
        method: "get",
        path: "/api/loinc",
        summary: "Get all LOINC codes",
        description:
            "Get paginated list of LOINC codes with optional search by name, code, loinc_code, loinc_display, or filter by modality",
        middleware: [authMiddleware, permissionMiddleware("read:loinc")] as const,
        request: {
            query: loincQuerySchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(loincPaginationResponseSchema, "LOINC codes retrieved successfully"),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(createErrorSchema(loincQuerySchema), "Invalid query parameters"),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                createMessageObjectSchema("Failed to fetch LOINC codes"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const query = c.req.valid("query");

            const data = await LoincService.getAllLoinc(query);

            return c.json(data, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to fetch LOINC codes" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

// Get LOINC by ID
loincController.openapi(
    createRoute({
        tags,
        method: "get",
        path: "/api/loinc/{id}",
        summary: "Get LOINC code by ID",
        description: "Get a single LOINC code by its ID",
        middleware: [authMiddleware, permissionMiddleware("read:loinc")] as const,
        request: {
            params: loincIdParamSchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(loincResponseSchema, "LOINC code retrieved successfully"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("LOINC code not found"),
                "LOINC code not found"
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
                createMessageObjectSchema("Failed to fetch LOINC code"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const { id } = c.req.valid("param");

            const loinc = await LoincService.getLoincById(id);

            if (!loinc) {
                return c.json({ message: "LOINC code not found" }, HttpStatusCodes.NOT_FOUND);
            }

            return c.json(loinc, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to fetch LOINC code" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

// Create LOINC
loincController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/loinc",
        summary: "Create LOINC code",
        description: "Create a new LOINC code",
        middleware: [authMiddleware, permissionMiddleware("create:loinc")] as const,
        request: {
            body: jsonContent(createLoincSchema, "LOINC code data"),
        },
        responses: {
            [HttpStatusCodes.CREATED]: jsonContent(loincResponseSchema, "LOINC code created successfully"),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(createErrorSchema(createLoincSchema), "Invalid request body"),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                createMessageObjectSchema("Failed to create LOINC code"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const data = c.req.valid("json");

            const loinc = await LoincService.createLoinc(data);

            return c.json(loinc, HttpStatusCodes.CREATED);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to create LOINC code" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

// Update LOINC
loincController.openapi(
    createRoute({
        tags,
        method: "patch",
        path: "/api/loinc/{id}",
        summary: "Update LOINC code",
        description: "Update an existing LOINC code",
        middleware: [authMiddleware, permissionMiddleware("update:loinc")] as const,
        request: {
            params: loincIdParamSchema,
            body: jsonContent(updateLoincSchema, "LOINC code update data"),
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(loincResponseSchema, "LOINC code updated successfully"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("LOINC code not found"),
                "LOINC code not found"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(createErrorSchema(updateLoincSchema), "Invalid request body"),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                createMessageObjectSchema("Failed to update LOINC code"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const { id } = c.req.valid("param");
            const data = c.req.valid("json");

            const loinc = await LoincService.updateLoinc(id, data);

            if (!loinc) {
                return c.json({ message: "LOINC code not found" }, HttpStatusCodes.NOT_FOUND);
            }

            return c.json(loinc, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to update LOINC code" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

// Delete LOINC
loincController.openapi(
    createRoute({
        tags,
        method: "delete",
        path: "/api/loinc/{id}",
        summary: "Delete LOINC code",
        description: "Delete a LOINC code",
        middleware: [authMiddleware, permissionMiddleware("delete:loinc")] as const,
        request: {
            params: loincIdParamSchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                createMessageObjectSchema("LOINC code deleted successfully"),
                "LOINC code deleted successfully"
            ),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("LOINC code not found"),
                "LOINC code not found"
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
                createMessageObjectSchema("Failed to delete LOINC code"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const { id } = c.req.valid("param");

            const deleted = await LoincService.deleteLoinc(id);

            if (!deleted) {
                return c.json({ message: "LOINC code not found" }, HttpStatusCodes.NOT_FOUND);
            }

            return c.json({ message: "LOINC code deleted successfully" }, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to delete LOINC code" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

export default loincController;
