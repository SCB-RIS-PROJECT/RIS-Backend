import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";
import createRouter from "@/config/create-router";
import {
    createPatientSchema,
    patientApiResponseSchema,
    patientErrorResponseSchema,
    patientIdParamSchema,
    patientPaginationApiResponseSchema,
    patientPaginationResponseSchema,
    patientQuerySchema,
    patientResponseSchema,
    updatePatientSchema,
} from "@/interface/patient.interface";
import { authMiddleware } from "@/middleware/auth.middleware";
import { permissionMiddleware } from "@/middleware/role-permission.middleware";
import { PatientService } from "@/service/patient.service";
import {
    response_success,
    response_created,
    handleServiceErrorWithResponse,
} from "@/utils/response.utils";

const patientController = createRouter();

const tags = ["Patient"];

// Get all patients with pagination
patientController.openapi(
    createRoute({
        tags,
        method: "get",
        path: "/api/patients",
        summary: "Get All Patients",
        description: "Get a paginated list of patients with optional search, sort, and filter.",
        middleware: [authMiddleware, permissionMiddleware("read:patient")] as const,
        request: {
            query: patientQuerySchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(patientPaginationApiResponseSchema, "Patients retrieved successfully"),
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
        const query = c.req.valid("query");
        const serviceResponse = await PatientService.getAllPatients(query);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully fetched all Patients!");
    }
);

// Get patient by ID
patientController.openapi(
    createRoute({
        tags,
        method: "get",
        path: "/api/patients/{id}",
        summary: "Get Patient by ID",
        description: "Get detailed information about a specific patient.",
        middleware: [authMiddleware, permissionMiddleware("read:patient")] as const,
        request: {
            params: patientIdParamSchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(patientApiResponseSchema, "Patient retrieved successfully"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                patientErrorResponseSchema,
                "Patient does not exist"
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
        const { id } = c.req.valid("param");
        const serviceResponse = await PatientService.getPatientById(id);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully fetched Patient!");
    }
);

// Create patient
patientController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/patients",
        summary: "Create Patient",
        description: "Create a new patient record.",
        middleware: [authMiddleware, permissionMiddleware("create:patient")] as const,
        request: {
            body: jsonContentRequired(createPatientSchema, "Patient data"),
        },
        responses: {
            [HttpStatusCodes.CREATED]: jsonContent(patientApiResponseSchema, "Patient created successfully"),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
                createErrorSchema(createPatientSchema),
                "Validation error(s)"
            ),
        },
    }),
    async (c) => {
        const data = c.req.valid("json");
        const serviceResponse = await PatientService.createPatient(data);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_created(c, serviceResponse.data, "Successfully created Patient!");
    }
);

// Update patient
patientController.openapi(
    createRoute({
        tags,
        method: "patch",
        path: "/api/patients/{id}",
        summary: "Update Patient",
        description: "Update an existing patient record.",
        middleware: [authMiddleware, permissionMiddleware("update:patient")] as const,
        request: {
            params: patientIdParamSchema,
            body: jsonContentRequired(updatePatientSchema, "Patient update data"),
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(patientApiResponseSchema, "Patient updated successfully"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                patientErrorResponseSchema,
                "Patient does not exist"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
                createErrorSchema(updatePatientSchema),
                "Validation error(s)"
            ),
        },
    }),
    async (c) => {
        const { id } = c.req.valid("param");
        const data = c.req.valid("json");

        const serviceResponse = await PatientService.updatePatient(id, data);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully updated Patient!");
    }
);

// Delete patient
patientController.openapi(
    createRoute({
        tags,
        method: "delete",
        path: "/api/patients/{id}",
        summary: "Delete Patient",
        description: "Delete a patient record permanently.",
        middleware: [authMiddleware, permissionMiddleware("delete:patient")] as const,
        request: {
            params: patientIdParamSchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                patientApiResponseSchema.extend({ data: z.null() }),
                "Patient successfully deleted"
            ),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                patientErrorResponseSchema,
                "Patient does not exist"
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
        const { id } = c.req.valid("param");
        const serviceResponse = await PatientService.deletePatient(id);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully deleted Patient!");
    }
);

export default patientController;
