import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCode from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";
import createRouter from "@/config/create-router";
import { loggerPino } from "@/config/log";
import {
    createPractitionerSchema,
    practitionerApiResponseSchema,
    practitionerErrorResponseSchema,
    practitionerIdParamSchema,    practitionerPaginationApiResponseSchema,    practitionerPaginationResponseSchema,
    practitionerQuerySchema,
    practitionerResponseSchema,
    updatePractitionerSchema,
} from "@/interface/practitioner.interface";
import { authMiddleware } from "@/middleware/auth.middleware";
import { permissionMiddleware } from "@/middleware/role-permission.middleware";
import { PractitionerService } from "@/service/practitioner.service";
import {
    response_success,
    response_created,
    handleServiceErrorWithResponse,
} from "@/utils/response.utils";

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
        [HttpStatusCode.OK]: jsonContent(practitionerPaginationApiResponseSchema, "Practitioners retrieved successfully"),
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
        [HttpStatusCode.OK]: jsonContent(practitionerApiResponseSchema, "Practitioner retrieved successfully"),
        [HttpStatusCode.NOT_FOUND]: jsonContent(practitionerErrorResponseSchema, "Not found"),
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
        [HttpStatusCode.CREATED]: jsonContent(practitionerApiResponseSchema, "Practitioner created successfully"),
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
        [HttpStatusCode.OK]: jsonContent(practitionerApiResponseSchema, "Practitioner updated successfully"),
        [HttpStatusCode.NOT_FOUND]: jsonContent(practitionerErrorResponseSchema, "Not found"),
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
        const serviceResponse = await PractitionerService.getAllPractitioners(query);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        loggerPino.debug(serviceResponse.data);
        return response_success(c, serviceResponse.data, "Successfully fetched all Practitioners!");
    })
    .openapi(getPractitionerById, async (c) => {
        const { id } = c.req.valid("param");
        const serviceResponse = await PractitionerService.getPractitionerById(id);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        if (serviceResponse.data) {
            loggerPino.debug(serviceResponse.data.name);
        }
        return response_success(c, serviceResponse.data, "Successfully fetched Practitioner!");
    })
    .openapi(createPractitioner, async (c) => {
        const data = c.req.valid("json");
        const serviceResponse = await PractitionerService.createPractitioner(data);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        if (serviceResponse.data) {
            loggerPino.debug(serviceResponse.data.name);
        }
        return response_created(c, serviceResponse.data, "Successfully created Practitioner!");
    })
    .openapi(updatePractitioner, async (c) => {
        const { id } = c.req.valid("param");
        const data = c.req.valid("json");
        const serviceResponse = await PractitionerService.updatePractitioner(id, data);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        if (serviceResponse.data) {
            loggerPino.debug(serviceResponse.data.name);
        }
        return response_success(c, serviceResponse.data, "Successfully updated Practitioner!");
    })
    .openapi(deletePractitioner, async (c) => {
        const { id } = c.req.valid("param");
        const serviceResponse = await PractitionerService.deletePractitioner(id);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        loggerPino.debug({ message: "Practitioner deleted successfully" });
        return response_success(c, serviceResponse.data, "Successfully deleted Practitioner!");
    });

export default practitionerController;
