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
        description: "Authenticate a user with email and password, and return a JWT token.",
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

        const result = await AuthService.login(c, payload);

        if (!result) {
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
                token: result.token,
                user: result.user,
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
        await AuthService.logout(c);

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
            "Get the currently authenticated user with roles and permissions. Requires JWT token in Authorization header.",
        security: [{ bearerAuth: [] }],
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
