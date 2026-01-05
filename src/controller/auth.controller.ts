import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";
import createRouter from "@/config/create-router";
import { 
    currentUserApiResponseSchema, 
    currentUserResponseSchema, 
    loginApiResponseSchema, 
    loginPayloadSchema, 
    loginResponseSchema,
    registerUserPayloadSchema,
    registerPractitionerPayloadSchema,
    registerApiResponseSchema
} from "@/interface/auth.interface";
import { authMiddleware } from "@/middleware/auth.middleware";
import { AuthService } from "@/service/auth.service";
import {
    response_success,
    handleServiceErrorWithResponse,
} from "@/utils/response.utils";

const authController = createRouter();

const tags = ["Authentication"];

// Login endpoint
authController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/auth/login",
        summary: "Login",
        description: "Authenticate a user with email and password, and return a JWT token.",
        request: {
            body: jsonContentRequired(loginPayloadSchema, "Login credentials"),
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(loginApiResponseSchema, "Login successful"),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Invalid email or password"),
                "Authentication failed"
            ),
            [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
                createErrorSchema(loginPayloadSchema),
                "Validation error(s)"
            ),
            [HttpStatusCodes.TOO_MANY_REQUESTS]: jsonContent(
                createMessageObjectSchema("Too many requests"),
                "Too many requests"
            ),
        },
    }),
    async (c) => {
        const payload = c.req.valid("json");
        const serviceResponse = await AuthService.login(c, payload);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Login successful!");
    }
);

// Logout endpoint
authController.openapi(
    createRoute({
        tags,
        method: "delete",
        path: "/api/auth/logout",
        summary: "Logout",
        description: "Logout the current user. With JWT, client should remove the token.",
        security: [{ bearerAuth: [] }],
        middleware: [authMiddleware],
        responses: {
            [HttpStatusCodes.OK]: jsonContent(createMessageObjectSchema("Logout successful"), "Logout successful"),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "No token provided"
            ),
            [HttpStatusCodes.TOO_MANY_REQUESTS]: jsonContent(
                createMessageObjectSchema("Too many requests"),
                "Too many requests"
            ),
        },
    }),
    async (c) => {
        const serviceResponse = await AuthService.logout(c);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Logout successful!");
    }
);

// Current user endpoint
authController.openapi(
    createRoute({
        tags,
        method: "get",
        path: "/api/auth/current",
        summary: "Get Current User",
        description:
            "Get the currently authenticated user with roles and permissions. Requires JWT token in Authorization header.",
        security: [{ bearerAuth: [] }],
        middleware: [authMiddleware],
        responses: {
            [HttpStatusCodes.OK]: jsonContent(currentUserApiResponseSchema, "Current user retrieved successfully"),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.TOO_MANY_REQUESTS]: jsonContent(
                createMessageObjectSchema("Too many requests"),
                "Too many requests"
            ),
        },
    }),

    async (c) => {
        const serviceResponse = await AuthService.current(c);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Current user retrieved successfully!");
    }
);

// Register User (non-practitioner) endpoint
authController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/auth/register",
        summary: "Register User",
        description: "Register a new user account (admin, staff, etc - non-practitioner).",
        request: {
            body: jsonContentRequired(registerUserPayloadSchema, "User registration data"),
        },
        responses: {
            [HttpStatusCodes.CREATED]: jsonContent(registerApiResponseSchema, "Registration successful"),
            [HttpStatusCodes.CONFLICT]: jsonContent(
                createMessageObjectSchema("Email already registered"),
                "Email conflict"
            ),
            [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
                createErrorSchema(registerUserPayloadSchema),
                "Validation error(s)"
            ),
            [HttpStatusCodes.TOO_MANY_REQUESTS]: jsonContent(
                createMessageObjectSchema("Too many requests"),
                "Too many requests"
            ),
        },
    }),
    async (c) => {
        const payload = c.req.valid("json");
        const serviceResponse = await AuthService.registerUser(c, payload);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "User registered successfully!");
    }
);

// Register Practitioner endpoint
authController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/auth/register-practitioner",
        summary: "Register Practitioner",
        description: "Register a new practitioner account with full practitioner data. The practitioner will be able to login with the provided credentials.",
        request: {
            body: jsonContentRequired(registerPractitionerPayloadSchema, "Practitioner registration data"),
        },
        responses: {
            [HttpStatusCodes.CREATED]: jsonContent(registerApiResponseSchema, "Practitioner registration successful"),
            [HttpStatusCodes.CONFLICT]: jsonContent(
                createMessageObjectSchema("Email or NIK already registered"),
                "Conflict error"
            ),
            [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
                createErrorSchema(registerPractitionerPayloadSchema),
                "Validation error(s)"
            ),
            [HttpStatusCodes.TOO_MANY_REQUESTS]: jsonContent(
                createMessageObjectSchema("Too many requests"),
                "Too many requests"
            ),
        },
    }),
    async (c) => {
        const payload = c.req.valid("json");
        const serviceResponse = await AuthService.registerPractitioner(c, payload);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Practitioner registered successfully!");
    }
);

export default authController;
