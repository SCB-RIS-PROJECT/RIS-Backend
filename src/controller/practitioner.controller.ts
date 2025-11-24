import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCode from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";
import createRouter from "@/config/create-router";
import { loggerPino } from "@/config/log";
import {
    createPractitionerSchema,
    practitionerIdParamSchema,
    practitionerPaginationResponseSchema,
    practitionerQuerySchema,
    practitionerResponseSchema,
    updatePractitionerSchema,
} from "@/interface/practitioner.interface";
import { authMiddleware } from "@/middleware/auth.middleware";
import { permissionMiddleware } from "@/middleware/role-permission.middleware";
import { PractitionerService } from "@/service/practitioner.service";

const tags = ["Practitioner"];

// GET /api/practitioners - Get all practitioners
const getAllPractitioners = createRoute({
    path: "/api/practitioners",
    method: "get",
    tags,
    summary: "Get all practitioners",
    middleware: [authMiddleware, permissionMiddleware("read:practitioner")] as const,
    request: {
        query: practitionerQuerySchema,
    },
    responses: {
        [HttpStatusCode.OK]: jsonContent(practitionerPaginationResponseSchema, "Practitioners retrieved successfully"),
        [HttpStatusCode.UNAUTHORIZED]: jsonContent(createErrorSchema(practitionerQuerySchema), "Unauthorized"),
        [HttpStatusCode.FORBIDDEN]: jsonContent(createErrorSchema(practitionerQuerySchema), "Forbidden"),
    },
});

// GET /api/practitioners/:id - Get practitioner by ID
const getPractitionerById = createRoute({
    path: "/api/practitioners/{id}",
    method: "get",
    tags,
    summary: "Get practitioner by ID",
    middleware: [authMiddleware, permissionMiddleware("read:practitioner")] as const,
    request: {
        params: practitionerIdParamSchema,
    },
    responses: {
        [HttpStatusCode.OK]: jsonContent(practitionerResponseSchema, "Practitioner retrieved successfully"),
        [HttpStatusCode.NOT_FOUND]: jsonContent(createMessageObjectSchema("Practitioner not found"), "Not found"),
        [HttpStatusCode.UNAUTHORIZED]: jsonContent(createErrorSchema(practitionerIdParamSchema), "Unauthorized"),
        [HttpStatusCode.FORBIDDEN]: jsonContent(createErrorSchema(practitionerIdParamSchema), "Forbidden"),
    },
});

// POST /api/practitioners - Create practitioner
const createPractitioner = createRoute({
    path: "/api/practitioners",
    method: "post",
    tags,
    summary: "Create new practitioner",
    middleware: [authMiddleware, permissionMiddleware("create:practitioner")] as const,
    request: {
        body: jsonContentRequired(createPractitionerSchema, "Practitioner data"),
    },
    responses: {
        [HttpStatusCode.CREATED]: jsonContent(practitionerResponseSchema, "Practitioner created successfully"),
        [HttpStatusCode.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(createPractitionerSchema),
            "Validation error"
        ),
        [HttpStatusCode.UNAUTHORIZED]: jsonContent(createErrorSchema(createPractitionerSchema), "Unauthorized"),
        [HttpStatusCode.FORBIDDEN]: jsonContent(createErrorSchema(createPractitionerSchema), "Forbidden"),
    },
});

// PATCH /api/practitioners/:id - Update practitioner
const updatePractitioner = createRoute({
    path: "/api/practitioners/{id}",
    method: "patch",
    tags,
    summary: "Update practitioner",
    middleware: [authMiddleware, permissionMiddleware("update:practitioner")] as const,
    request: {
        params: practitionerIdParamSchema,
        body: jsonContentRequired(updatePractitionerSchema, "Practitioner update data"),
    },
    responses: {
        [HttpStatusCode.OK]: jsonContent(practitionerResponseSchema, "Practitioner updated successfully"),
        [HttpStatusCode.NOT_FOUND]: jsonContent(createMessageObjectSchema("Practitioner not found"), "Not found"),
        [HttpStatusCode.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(updatePractitionerSchema),
            "Validation error"
        ),
        [HttpStatusCode.UNAUTHORIZED]: jsonContent(createErrorSchema(practitionerIdParamSchema), "Unauthorized"),
        [HttpStatusCode.FORBIDDEN]: jsonContent(createErrorSchema(practitionerIdParamSchema), "Forbidden"),
    },
});

// DELETE /api/practitioners/:id - Delete practitioner
const deletePractitioner = createRoute({
    path: "/api/practitioners/{id}",
    method: "delete",
    tags,
    summary: "Delete practitioner",
    middleware: [authMiddleware, permissionMiddleware("delete:practitioner")] as const,
    request: {
        params: practitionerIdParamSchema,
    },
    responses: {
        [HttpStatusCode.OK]: jsonContent(createMessageObjectSchema("Practitioner deleted successfully"), "Deleted"),
        [HttpStatusCode.NOT_FOUND]: jsonContent(createMessageObjectSchema("Practitioner not found"), "Not found"),
        [HttpStatusCode.UNAUTHORIZED]: jsonContent(createErrorSchema(practitionerIdParamSchema), "Unauthorized"),
        [HttpStatusCode.FORBIDDEN]: jsonContent(createErrorSchema(practitionerIdParamSchema), "Forbidden"),
    },
});

// Create router and register routes
const practitionerController = createRouter()
    .openapi(getAllPractitioners, async (c) => {
        const query = c.req.valid("query");
        const result = await PractitionerService.getAllPractitioners(query);
        loggerPino.debug(result);
        return c.json(result, HttpStatusCode.OK);
    })
    .openapi(getPractitionerById, async (c) => {
        const { id } = c.req.valid("param");
        const practitioner = await PractitionerService.getPractitionerById(id);

        if (!practitioner) {
            loggerPino.debug({ message: "Practitioner not found" });
            return c.json({ message: "Practitioner not found" }, HttpStatusCode.NOT_FOUND);
        }

        loggerPino.debug(practitioner.name);
        return c.json(practitioner, HttpStatusCode.OK);
    })
    .openapi(createPractitioner, async (c) => {
        const data = c.req.valid("json");
        const practitioner = await PractitionerService.createPractitioner(data);
        loggerPino.debug(practitioner.name);
        return c.json(practitioner, HttpStatusCode.CREATED);
    })
    .openapi(updatePractitioner, async (c) => {
        const { id } = c.req.valid("param");
        const data = c.req.valid("json");
        const practitioner = await PractitionerService.updatePractitioner(id, data);

        if (!practitioner) {
            loggerPino.debug({ message: "Practitioner not found" });
            return c.json({ message: "Practitioner not found" }, HttpStatusCode.NOT_FOUND);
        }

        loggerPino.debug(practitioner.name);
        return c.json(practitioner, HttpStatusCode.OK);
    })
    .openapi(deletePractitioner, async (c) => {
        const { id } = c.req.valid("param");
        const deleted = await PractitionerService.deletePractitioner(id);

        if (!deleted) {
            loggerPino.debug({ message: "Practitioner not found" });
            return c.json({ message: "Practitioner not found" }, HttpStatusCode.NOT_FOUND);
        }

        loggerPino.debug({ message: "Practitioner deleted successfully" });
        return c.json({ message: "Practitioner deleted successfully" }, HttpStatusCode.OK);
    });

export default practitionerController;
