import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";
import createRouter from "@/config/create-router";
import { loggerPino } from "@/config/log";
import { ihsPatientBundleSchema, ihsPractitionerBundleSchema, nikParamSchema } from "@/interface/satu-sehat.interface";
import { authMiddleware } from "@/middleware/auth.middleware";
import { permissionMiddleware } from "@/middleware/role-permission.middleware";
import { SatuSehatService } from "@/service/satu-sehat.service";
import { createResponse } from "@/lib/utils";
import { 
    response_success,
    response_not_found, 
    handleServiceErrorWithResponse 
} from "@/utils/response.utils";

const satuSehatController = createRouter();

const tags = ["Satu Sehat"];

// Token cache info response schema
const tokenCacheInfoSchema = z.object({
    hasToken: z.boolean().describe("Whether a token is cached"),
    isValid: z.boolean().describe("Whether the cached token is still valid"),
    expiresAt: z.number().nullable().describe("Unix timestamp when token expires"),
    lastRefreshed: z.number().nullable().describe("Unix timestamp when token was last refreshed"),
    remainingSeconds: z.number().nullable().describe("Seconds until token expires"),
    expiresAtFormatted: z.string().nullable().describe("Human-readable expiry time"),
    lastRefreshedFormatted: z.string().nullable().describe("Human-readable last refresh time"),
});

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
        const { nik } = c.req.valid("param");

        const serviceResponse = await SatuSehatService.getIHSPatientByNIK(nik);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        if (!serviceResponse.data || !serviceResponse.data.entry || serviceResponse.data.entry.length === 0) {
            return response_not_found(c, "Patient not found in IHS");
        }

        return response_success(c, serviceResponse.data, "Successfully fetched IHS Patient!");
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
        const { nik } = c.req.valid("param");

        const serviceResponse = await SatuSehatService.getIHSPractitionerByNIK(nik);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        if (!serviceResponse.data || !serviceResponse.data.entry || serviceResponse.data.entry.length === 0) {
            return response_not_found(c, "Practitioner not found in IHS");
        }

        return response_success(c, serviceResponse.data, "Successfully fetched IHS Practitioner!");
    }
);

// Get Token Cache Info (for monitoring)
satuSehatController.openapi(
    createRoute({
        tags,
        method: "get",
        path: "/api/satu-sehat/token-info",
        summary: "Get Satu Sehat token cache information",
        description: `
Get information about the cached Satu Sehat access token.

This endpoint is useful for:
- Monitoring token lifecycle
- Debugging token-related issues
- Checking when token will expire
- Verifying token refresh mechanism

**Token Lifecycle:**
- Token expires in 14399 seconds (~4 hours) from Satu Sehat
- System caches token with 30 second buffer for maximum utilization
- Actual cache duration: ~3h 59m 30s (99.8% of token lifetime)
- Token is automatically refreshed when expired
        `,
        middleware: [authMiddleware, permissionMiddleware("read:satu_sehat")] as const,
        responses: {
            [HttpStatusCodes.OK]: jsonContent(tokenCacheInfoSchema, "Token cache info retrieved successfully"),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(tokenCacheInfoSchema, "Failed to get token info"),
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
        try {
            const cacheInfo = SatuSehatService.getTokenCacheInfo();
            
            // Format timestamps for better readability
            const response = {
                ...cacheInfo,
                expiresAtFormatted: cacheInfo.expiresAt 
                    ? new Date(cacheInfo.expiresAt).toISOString()
                    : null,
                lastRefreshedFormatted: cacheInfo.lastRefreshed
                    ? new Date(cacheInfo.lastRefreshed).toISOString()
                    : null,
            };

            return c.json(response, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json(
                {
                    hasToken: false,
                    isValid: false,
                    expiresAt: null,
                    lastRefreshed: null,
                    remainingSeconds: null,
                    expiresAtFormatted: null,
                    lastRefreshedFormatted: null,
                },
                HttpStatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }
);

export default satuSehatController;
