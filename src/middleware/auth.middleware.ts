import { createMiddleware } from "hono/factory";
import * as HttpStatusCodes from "stoker/http-status-codes";
import type { AppBindings } from "@/interface";
import { verifyToken } from "@/lib/jwt";
import { UserService } from "@/service/user.service";

export const authMiddleware = createMiddleware<AppBindings>(async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return c.json(
            {
                message: "Not authenticated",
            },
            HttpStatusCodes.UNAUTHORIZED
        );
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    const payload = verifyToken(token);

    if (!payload) {
        return c.json(
            {
                message: "Invalid or expired token",
            },
            HttpStatusCodes.UNAUTHORIZED
        );
    }

    const userResponse = await UserService.getUserById(payload.userId);

    if (!userResponse.status || !userResponse.data) {
        return c.json(
            {
                message: "User not found",
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    c.set("user", userResponse.data);

    await next();
});
