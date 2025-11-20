// biome-ignore-all lint/suspicious/noConsole: <because test>

import { eq } from "drizzle-orm";
import configureOpenAPI from "@/config/configure-open-api";
import createApp from "@/config/create-app";
import authController from "@/controller/auth.controller";
import db from "@/database/db";
import {
    permissionTable,
    roleTable,
    userPermissionTable,
    userRoleTable,
} from "@/database/schemas/schema-role-permission";
import { userTable } from "@/database/schemas/schema-user";

const app = createApp();
configureOpenAPI(app);
app.route("/", authController);

export class UserTest {
    static async create() {
        const password = await Bun.password.hash("password", {
            algorithm: "bcrypt",
            cost: 10,
        });

        await db.insert(userTable).values({
            name: "Test User",
            email: "test@test.com",
            password,
        });
    }

    static async delete() {
        await db.delete(userTable).where(eq(userTable.email, "test@test.com"));
    }

    /**
     * Login and get session cookie
     */
    static async login(): Promise<string> {
        const response = await app.request("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: "test@test.com",
                password: "password",
            }),
        });

        if (response.status !== 200) {
            throw new Error("Login failed");
        }

        const setCookieHeader = response.headers.get("Set-Cookie");
        if (!setCookieHeader) {
            throw new Error("No Set-Cookie header in response");
        }

        return setCookieHeader;
    }

    /**
     * Create user with specific roles
     */
    static async createWithRole(email: string, roleNames: string[]) {
        const password = await Bun.password.hash("password", {
            algorithm: "bcrypt",
            cost: 10,
        });

        // Create user
        const [user] = await db
            .insert(userTable)
            .values({
                name: email.split("@")[0],
                email,
                password,
            })
            .returning();

        // Get role IDs by name
        const roles = await db.select().from(roleTable).where(eq(roleTable.name, roleNames[0]));

        if (roleNames.length > 1) {
            const otherRoles = await Promise.all(
                roleNames.slice(1).map((roleName) => db.select().from(roleTable).where(eq(roleTable.name, roleName)))
            );
            roles.push(...otherRoles.flat());
        }

        // Assign roles to user
        if (roles.length > 0) {
            await db.insert(userRoleTable).values(
                roles.map((role) => ({
                    id_user: user.id,
                    id_role: role.id,
                }))
            );
        }

        return user;
    }

    /**
     * Create user with specific permissions
     */
    static async createWithPermission(email: string, permissionNames: string[]) {
        const password = await Bun.password.hash("password", {
            algorithm: "bcrypt",
            cost: 10,
        });

        // Create user
        const [user] = await db
            .insert(userTable)
            .values({
                name: email.split("@")[0],
                email,
                password,
            })
            .returning();

        // Get permission IDs by name
        const permissions = await db.select().from(permissionTable).where(eq(permissionTable.name, permissionNames[0]));

        if (permissionNames.length > 1) {
            const otherPermissions = await Promise.all(
                permissionNames
                    .slice(1)
                    .map((permName) => db.select().from(permissionTable).where(eq(permissionTable.name, permName)))
            );
            permissions.push(...otherPermissions.flat());
        }

        // Assign permissions to user
        if (permissions.length > 0) {
            await db.insert(userPermissionTable).values(
                permissions.map((permission) => ({
                    id_user: user.id,
                    id_permission: permission.id,
                }))
            );
        }

        return user;
    }

    /**
     * Login as specific user and get session cookie
     */
    static async loginAs(email: string, password: string = "password"): Promise<string> {
        const response = await app.request("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                password,
            }),
        });

        if (response.status !== 200) {
            throw new Error(`Login failed for ${email}`);
        }

        const setCookieHeader = response.headers.get("Set-Cookie");
        if (!setCookieHeader) {
            throw new Error("No Set-Cookie header in response");
        }

        return setCookieHeader;
    }

    /**
     * Delete user by email
     */
    static async deleteByEmail(email: string) {
        await db.delete(userTable).where(eq(userTable.email, email));
    }

    /**
     * Get user by email
     */
    static async getByEmail(email: string) {
        const [user] = await db.select().from(userTable).where(eq(userTable.email, email)).limit(1);
        return user;
    }
}

/**
 * Test utilities for cleaning up data
 */
export class TestUtil {
    /**
     * Sleep for a specified duration (to avoid rate limiting)
     */
    static async sleep(ms: number = 100) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Clean up all test data
     */
    static async cleanup() {
        // Clean up in reverse order of dependencies
        try {
            await db.delete(userRoleTable);
            await db.delete(userPermissionTable);
        } catch (error) {
            console.warn("Error cleaning up test data:", error);
        }
    }
}
