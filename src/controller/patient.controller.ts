import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";
import createRouter from "@/config/create-router";
import {
    createPatientSchema,
    patientIdParamSchema,
    patientPaginationResponseSchema,
    patientQuerySchema,
    patientResponseSchema,
    updatePatientSchema,
} from "@/interface/patient.interface";
import { authMiddleware } from "@/middleware/auth.middleware";
import { permissionMiddleware } from "@/middleware/role-permission.middleware";
import { PatientService } from "@/service/patient.service";

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
            [HttpStatusCodes.OK]: jsonContent(patientPaginationResponseSchema, "Patients retrieved successfully"),
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
        const result = await PatientService.getAllPatients(query);
        return c.json(result, HttpStatusCodes.OK);
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
            [HttpStatusCodes.OK]: jsonContent(patientResponseSchema, "Patient retrieved successfully"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("Patient not found"),
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
        const patient = await PatientService.getPatientById(id);

        if (!patient) {
            return c.json(
                {
                    message: "Patient not found",
                },
                HttpStatusCodes.NOT_FOUND
            );
        }

        return c.json(patient, HttpStatusCodes.OK);
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
            [HttpStatusCodes.CREATED]: jsonContent(patientResponseSchema, "Patient created successfully"),
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
        const patient = await PatientService.createPatient(data);
        return c.json(patient, HttpStatusCodes.CREATED);
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
            [HttpStatusCodes.OK]: jsonContent(patientResponseSchema, "Patient updated successfully"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("Patient not found"),
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

        const patient = await PatientService.updatePatient(id, data);

        if (!patient) {
            return c.json(
                {
                    message: "Patient not found",
                },
                HttpStatusCodes.NOT_FOUND
            );
        }

        return c.json(patient, HttpStatusCodes.OK);
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
                createMessageObjectSchema("Patient deleted successfully"),
                "Patient deleted"
            ),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("Patient not found"),
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
        const deleted = await PatientService.deletePatient(id);

        if (!deleted) {
            return c.json(
                {
                    message: "Patient not found",
                },
                HttpStatusCodes.NOT_FOUND
            );
        }

        return c.json(
            {
                message: "Patient deleted successfully",
            },
            HttpStatusCodes.OK
        );
    }
);

export default patientController;
