import { createMiddleware } from "hono/factory";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { getSession, getSessionCookie } from "@/config/session";
import type { AppBindings } from "@/interface";
import { UserService } from "@/service/user.service";

export const authMiddleware = createMiddleware<AppBindings>(async (c, next) => {
    const sessionId = getSessionCookie(c);

    if (!sessionId) {
        return c.json(
            {
                message: "Not authenticated",
            },
            HttpStatusCodes.UNAUTHORIZED
        );
    }

    const session = await getSession(sessionId);

    if (!session) {
        return c.json(
            {
                message: "Invalid or expired session",
            },
            HttpStatusCodes.UNAUTHORIZED
        );
    }

    const user = await UserService.getUserById(session.id_user);

    if (!user) {
        return c.json(
            {
                message: "User not found",
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    c.set("user", user);

    await next();
});
