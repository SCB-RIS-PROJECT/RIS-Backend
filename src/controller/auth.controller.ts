import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";
import createRouter from "@/config/create-router";
import { currentUserResponseSchema, loginPayloadSchema, loginResponseSchema } from "@/interface/auth.interface";
import { authMiddleware } from "@/middleware/auth.middleware";
import { AuthService } from "@/service/auth.service";

const authController = createRouter();

const tags = ["Authentication"];

// Login endpoint
authController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/auth/login",
        summary: "Login",
        description: "Authenticate a user with email and password, create a session, and set an HTTP-only cookie.",
        request: {
            body: jsonContentRequired(loginPayloadSchema, "Login credentials"),
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(loginResponseSchema, "Login successful"),
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

        const user = await AuthService.login(c, payload);

        if (!user) {
            return c.json(
                {
                    message: "Invalid email or password",
                },
                HttpStatusCodes.UNAUTHORIZED
            );
        }

        return c.json(
            {
                message: "Login successful",
                user,
            },
            HttpStatusCodes.OK
        );
    }
);

// Logout endpoint
authController.openapi(
    createRoute({
        tags,
        method: "delete",
        path: "/api/auth/logout",
        summary: "Logout",
        description: "Destroy the current user session and clear the HTTP-only cookie.",
        security: [{ cookieAuth: [] }],
        middleware: [authMiddleware],
        responses: {
            [HttpStatusCodes.OK]: jsonContent(createMessageObjectSchema("Logout successful"), "Logout successful"),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("No active session found"),
                "No session to logout"
            ),
            [HttpStatusCodes.TOO_MANY_REQUESTS]: jsonContent(
                createMessageObjectSchema("Too many requests"),
                "Too many requests"
            ),
        },
    }),
    async (c) => {
        const success = await AuthService.logout(c);

        if (!success) {
            return c.json(
                {
                    message: "No active session found",
                },
                HttpStatusCodes.UNAUTHORIZED
            );
        }

        return c.json(
            {
                message: "Logout successful",
            },
            HttpStatusCodes.OK
        );
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
            "Get the currently authenticated user with roles and permissions. Requires authentication via session cookie.",
        security: [{ cookieAuth: [] }],
        middleware: [authMiddleware],
        responses: {
            [HttpStatusCodes.OK]: jsonContent(currentUserResponseSchema, "Current user retrieved successfully"),
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
        const user = await AuthService.current(c);

        if (!user) {
            return c.json(
                {
                    message: "Not authenticated",
                },
                HttpStatusCodes.UNAUTHORIZED
            );
        }

        return c.json(user, HttpStatusCodes.OK);
    }
);

export default authController;
