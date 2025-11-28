import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";
import createRouter from "@/config/create-router";
import { loggerPino } from "@/config/log";
import { ihsPatientBundleSchema, ihsPractitionerBundleSchema, nikParamSchema } from "@/interface/satu-sehat.interface";
import { authMiddleware } from "@/middleware/auth.middleware";
import { permissionMiddleware } from "@/middleware/role-permission.middleware";
import { SatuSehatService } from "@/service/satu-sehat.service";

const satuSehatController = createRouter();

const tags = ["Satu Sehat"];

// Get IHS Patient by NIK
satuSehatController.openapi(
    createRoute({
        tags,
        method: "get",
        path: "/api/satu-sehat/ihs-patient/{nik}",
        summary: "Get IHS Patient by NIK",
        description: "Get IHS Patient data from Satu Sehat by NIK",
        middleware: [authMiddleware, permissionMiddleware("read:satu_sehat")] as const,
        request: {
            params: nikParamSchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(ihsPatientBundleSchema, "IHS Patient data retrieved successfully"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("Patient not found in IHS"),
                "Not found"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(createErrorSchema(nikParamSchema), "Invalid NIK format"),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                createMessageObjectSchema("Failed to fetch IHS Patient data"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const { nik } = c.req.valid("param");

            const data = await SatuSehatService.getIHSPatientByNIK(nik);

            if (!data.entry || data.entry.length === 0) {
                return c.json({ message: "Patient not found in IHS" }, HttpStatusCodes.NOT_FOUND);
            }

            return c.json(data, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to fetch IHS Patient data" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

// Get IHS Practitioner by NIK
satuSehatController.openapi(
    createRoute({
        tags,
        method: "get",
        path: "/api/satu-sehat/ihs-practitioner/{nik}",
        summary: "Get IHS Practitioner by NIK",
        description: "Get IHS Practitioner data from Satu Sehat by NIK",
        middleware: [authMiddleware, permissionMiddleware("read:satu_sehat")] as const,
        request: {
            params: nikParamSchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                ihsPractitionerBundleSchema,
                "IHS Practitioner data retrieved successfully"
            ),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("Practitioner not found in IHS"),
                "Not found"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(createErrorSchema(nikParamSchema), "Invalid NIK format"),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                createMessageObjectSchema("Failed to fetch IHS Practitioner data"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const { nik } = c.req.valid("param");

            const data = await SatuSehatService.getIHSPractitionerByNIK(nik);

            if (!data.entry || data.entry.length === 0) {
                return c.json({ message: "Practitioner not found in IHS" }, HttpStatusCodes.NOT_FOUND);
            }

            return c.json(data, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to fetch IHS Practitioner data" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

export default satuSehatController;
