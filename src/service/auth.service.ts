import { eq } from "drizzle-orm";
import type { Context } from "hono";
import db from "@/database/db";
import { userTable } from "@/database/schemas/schema-user";
import type { AppBindings } from "@/interface";
import type { LoginData, LoginPayload, UserResponse } from "@/interface/auth.interface";
import { verifyPassword } from "@/lib/crypto";
import { generateToken } from "@/lib/jwt";
import { UserService } from "@/service/user.service";

export class AuthService {
    static async login(c: Context<AppBindings>, payload: LoginPayload): Promise<LoginData | null> {
        // Find user by email
        const [user] = await db.select().from(userTable).where(eq(userTable.email, payload.email)).limit(1);

        if (!user) return null;

        // Verify password
        const isPasswordValid = await verifyPassword(payload.password, user.password);

        if (!isPasswordValid) return null;

        // Get user with roles and permissions
        const userWithRolesAndPermissions = await UserService.attachRolesAndPermissions(user);

        // Generate JWT token
        const token = generateToken({
            userId: user.id,
            email: user.email,
        });

        return {
            token,
            user: {
                id: userWithRolesAndPermissions.id,
                name: userWithRolesAndPermissions.name,
                email: userWithRolesAndPermissions.email,
                avatar: userWithRolesAndPermissions.avatar,
                email_verified_at: userWithRolesAndPermissions.email_verified_at?.toISOString() || null,
                created_at: userWithRolesAndPermissions.created_at.toISOString(),
                updated_at: userWithRolesAndPermissions.updated_at?.toISOString() || null,
                roles: userWithRolesAndPermissions.roles,
                permissions: userWithRolesAndPermissions.permissions,
            },
        };
    }

    static async logout(c: Context<AppBindings>): Promise<boolean> {
        // With JWT, logout is handled client-side by removing the token
        // Server-side logout can be implemented with token blacklist if needed
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
