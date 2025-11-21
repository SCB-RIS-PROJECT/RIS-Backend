import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { TestUtil, UserTest } from "@/__test__/test-util";
import configureOpenAPI from "@/config/configure-open-api";
import createApp from "@/config/create-app";
import { loggerPino } from "@/config/log";
import authController from "@/controller/auth.controller";

// Skip rate limiting for tests to avoid false failures
const app = createApp({ skipRateLimit: true });
configureOpenAPI(app);
app.route("/", authController);

describe("POST /api/auth/login", () => {
    beforeEach(async () => {
        await UserTest.create();
        await TestUtil.sleep(50);
    });

    afterEach(async () => {
        await TestUtil.sleep(50);
    });

    it("should be able to login with valid credentials", async () => {
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

        const body = await response.json();
        loggerPino.debug(body);

        expect(response.status).toBe(HttpStatusCodes.OK);
        expect(body.message).toBe("Login successful");
        expect(body.user).toBeDefined();
        expect(body.user.email).toBe("test@test.com");
        expect(body.user.name).toBe("Test User");
    });

    it("should not be able to login with invalid credentials", async () => {
        const response = await app.request("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: "salah@salah.com",
                password: "salahpassword",
            }),
        });

        const body = await response.json();
        loggerPino.debug(body);

        expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
        expect(body.message).toBe("Invalid email or password");
    });

    it("should not be able to login with invalid email", async () => {
        const response = await app.request("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: "test@salah.com",
                password: "password",
            }),
        });

        const body = await response.json();
        loggerPino.debug(body);

        expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
        expect(body.message).toBe("Invalid email or password");
    });

    it("should not be able to login with invalid password", async () => {
        const response = await app.request("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: "test@test.com",
                password: "password1",
            }),
        });

        const body = await response.json();
        loggerPino.debug(body);

        expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
        expect(body.message).toBe("Invalid email or password");
    });

    it("should not be able to login with invalid validation", async () => {
        const response = await app.request("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: "test",
                password: "pass",
            }),
        });

        const body = await response.json();
        loggerPino.debug(body);

        expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
        expect(body.error).toBeDefined();
    });

    it("should be able to get current user", async () => {
        const cookie = await UserTest.login();

        const response = await app.request("/api/auth/current", {
            method: "GET",
            headers: {
                Cookie: cookie,
            },
        });

        const body = await response.json();
        loggerPino.debug(body);

        expect(response.status).toBe(HttpStatusCodes.OK);
        expect(body.email).toBe("test@test.com");
        expect(body.name).toBe("Test User");
        expect(body.roles).toBeDefined();
        expect(body.permissions).toBeDefined();
    });

    it("should not be able to get current user without login", async () => {
        const response = await app.request("/api/auth/current", {
            method: "GET",
        });

        const body = await response.json();
        loggerPino.debug(body);

        expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
        expect(body.message).toBe("Not authenticated");
    });

    it("should not be able to get current user after logout", async () => {
        const cookie = await UserTest.login();

        await app.request("/api/auth/logout", {
            method: "DELETE",
            headers: {
                Cookie: cookie,
            },
        });

        const response = await app.request("/api/auth/current", {
            method: "GET",
            headers: {
                Cookie: cookie,
            },
        });

        const body = await response.json();
        loggerPino.debug(body);

        expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
        expect(body.message).toBeDefined();
    });

    it("should be able to logout", async () => {
        const cookie = await UserTest.login();
        const response = await app.request("/api/auth/logout", {
            method: "DELETE",
            headers: {
                Cookie: cookie,
            },
        });

        const body = await response.json();
        loggerPino.debug(body);

        expect(response.status).toBe(HttpStatusCodes.OK);
        expect(body.message).toBe("Logout successful");
    });

    afterEach(async () => {
        await UserTest.delete();
    });
});
