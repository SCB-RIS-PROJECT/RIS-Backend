import { eq } from "drizzle-orm";
import type { Context } from "hono";
import db from "@/database/db";
import { userTable } from "@/database/schemas/schema-user";
import type { AppBindings } from "@/interface";
import type { LoginData, LoginPayload, UserResponse } from "@/interface/auth.interface";
import { verifyPassword } from "@/lib/crypto";
import { generateToken } from "@/lib/jwt";
import { UserService } from "@/service/user.service";
import {
    type ServiceResponse,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    UNAUTHORIZED_SERVICE_RESPONSE,
} from "@/entities/Service";

export class AuthService {
    static async login(c: Context<AppBindings>, payload: LoginPayload): Promise<ServiceResponse<LoginData>> {
        try {
            // Find user by email
            const [user] = await db.select().from(userTable).where(eq(userTable.email, payload.email)).limit(1);

            if (!user) {
                return {
                    status: false,
                    err: {
                        message: "Invalid email or password",
                        code: 401,
                    },
                };
            }

            // Verify password
            const isPasswordValid = await verifyPassword(payload.password, user.password);

            if (!isPasswordValid) {
                return {
                    status: false,
                    err: {
                        message: "Invalid email or password",
                        code: 401,
                    },
                };
            }

            // Get user with roles and permissions
            const userWithRolesAndPermissions = await UserService.attachRolesAndPermissions(user);

            // Generate JWT token
            const token = generateToken({
                userId: user.id,
                email: user.email,
            });

            return {
                status: true,
                data: {
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
                },
            };
        } catch (err) {
            console.error(`AuthService.login: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async logout(c: Context<AppBindings>): Promise<ServiceResponse<{ success: boolean }>> {
        try {
            // With JWT, logout is handled client-side by removing the token
            // Server-side logout can be implemented with token blacklist if needed
            return {
                status: true,
                data: { success: true },
            };
        } catch (err) {
            console.error(`AuthService.logout: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async current(c: Context<AppBindings>): Promise<ServiceResponse<UserResponse>> {
        try {
            const sessionUser = c.get("user");
            const userId = sessionUser?.id;

            if (!userId) return UNAUTHORIZED_SERVICE_RESPONSE;

            const userResponse = await UserService.getUserById(userId);

            if (!userResponse.status || !userResponse.data) return UNAUTHORIZED_SERVICE_RESPONSE;

            const userData = userResponse.data;

            return {
                status: true,
                data: {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    avatar: userData.avatar,
                    email_verified_at: userData.email_verified_at?.toISOString() || null,
                    created_at: userData.created_at.toISOString(),
                    updated_at: userData.updated_at?.toISOString() || null,
                    roles: userData.roles,
                    permissions: userData.permissions,
                },
            };
        } catch (err) {
            console.error(`AuthService.current: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }
}
