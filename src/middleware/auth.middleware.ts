import { createMiddleware } from "hono/factory";
import * as HttpStatusCodes from "stoker/http-status-codes";
import type { AppBindings } from "@/interface";
import { verifyToken } from "@/lib/jwt";
import { UserService } from "@/service/user.service";
import { UNAUTHORIZED_SERVICE_RESPONSE } from "@/entities/Service";

export const authMiddleware = createMiddleware<AppBindings>(async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return c.json(
            {
                content: {
                    data: null,
                },
                message: "Unauthorized - Missing or invalid authorization header",
                errors: [],
            },
            HttpStatusCodes.UNAUTHORIZED
        );
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    const payload = verifyToken(token);

    if (!payload) {
        return c.json(
            {
                content: {
                    data: null,
                },
                message: "Invalid or expired token",
                errors: [],
            },
            HttpStatusCodes.UNAUTHORIZED
        );
    }

    const userResponse = await UserService.getUserById(payload.userId);

    if (!userResponse.status || !userResponse.data) {
        return c.json(
            {
                content: {
                    data: null,
                },
                message: "User not found",
                errors: [],
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    c.set("user", userResponse.data);

    await next();
});
