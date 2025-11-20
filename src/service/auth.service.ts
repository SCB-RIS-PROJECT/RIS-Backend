import { eq } from "drizzle-orm";
import type { Context } from "hono";
import {
    clearSessionCookie,
    createSession,
    destroySession,
    getSessionCookie,
    setSessionCookie,
} from "@/config/session";
import db from "@/database/db";
import { userTable } from "@/database/schemas/schema-user";
import type { AppBindings } from "@/interface";
import type { LoginPayload, UserResponse } from "@/interface/auth.interface";
import { verifyPassword } from "@/lib/crypto";
import { UserService } from "@/service/user.service";

export class AuthService {
    static async login(c: Context<AppBindings>, payload: LoginPayload): Promise<UserResponse | null> {
        // Find user by email
        const [user] = await db.select().from(userTable).where(eq(userTable.email, payload.email)).limit(1);

        if (!user) return null;

        // Verify password
        const isPasswordValid = await verifyPassword(payload.password, user.password);

        if (!isPasswordValid) return null;

        // Get user with roles and permissions
        const userWithRolesAndPermissions = await UserService.attachRolesAndPermissions(user);

        // Create session
        const sessionId = await createSession({
            userId: user.id,
            ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
            userAgent: c.req.header("user-agent"),
        });

        // Set session cookie
        setSessionCookie(c, sessionId);

        return {
            id: userWithRolesAndPermissions.id,
            name: userWithRolesAndPermissions.name,
            email: userWithRolesAndPermissions.email,
            avatar: userWithRolesAndPermissions.avatar,
            email_verified_at: userWithRolesAndPermissions.email_verified_at?.toISOString() || null,
            created_at: userWithRolesAndPermissions.created_at.toISOString(),
            updated_at: userWithRolesAndPermissions.updated_at?.toISOString() || null,
            roles: userWithRolesAndPermissions.roles,
            permissions: userWithRolesAndPermissions.permissions,
        };
    }

    static async logout(c: Context<AppBindings>): Promise<boolean> {
        const sessionId = getSessionCookie(c);

        if (!sessionId) return false;

        await destroySession(sessionId);

        clearSessionCookie(c);

        return true;
    }

    static async current(c: Context<AppBindings>): Promise<UserResponse | null> {
        const user = c.get("user");
        const userId = user?.id;

        if (!userId) return null;

        const userWithRolesAndPermissions = await UserService.getUserById(userId);

        if (!userWithRolesAndPermissions) return null;

        return {
            id: userWithRolesAndPermissions.id,
            name: userWithRolesAndPermissions.name,
            email: userWithRolesAndPermissions.email,
            avatar: userWithRolesAndPermissions.avatar,
            email_verified_at: userWithRolesAndPermissions.email_verified_at?.toISOString() || null,
            created_at: userWithRolesAndPermissions.created_at.toISOString(),
            updated_at: userWithRolesAndPermissions.updated_at?.toISOString() || null,
            roles: userWithRolesAndPermissions.roles,
            permissions: userWithRolesAndPermissions.permissions,
        };
    }
}
