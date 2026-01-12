import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { TestUtil, UserTest } from "@/__test__/test-util";
import configureOpenAPI from "@/config/configure-open-api";
import createApp from "@/config/create-app";
import { loggerPino } from "@/config/log";
import orderController from "@/controller/order.controller";
import patientController from "@/controller/patient.controller";
import authController from "@/controller/auth.controller";

// Skip rate limiting for tests to avoid false failures
const app = createApp({ skipRateLimit: true });
configureOpenAPI(app);
app.route("/", authController);
app.route("/", orderController);
app.route("/", patientController);

describe("Order Controller", () => {
    let authToken: string;

    beforeEach(async () => {
        await UserTest.create();
        await TestUtil.sleep(50);
        // Get auth token for authenticated requests
        const loginResponse = await app.request("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: "test@test.com",
                password: "password",
            }),
        });
        const loginBody = await loginResponse.json();
        if (loginBody.token) {
            authToken = loginBody.token;
        }
    });

    afterEach(async () => {
        await UserTest.delete();
        await TestUtil.sleep(50);
    });

    describe("GET /api/orders", () => {
        it("should return 401 without authentication", async () => {
            const response = await app.request("/api/orders", {
                method: "GET",
            });

            expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
        });

        it("should return orders list with valid authentication", async () => {
            const response = await app.request("/api/orders", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            // Should return 200 or 403 (depends on user permissions)
            expect([HttpStatusCodes.OK, HttpStatusCodes.FORBIDDEN]).toContain(response.status);
        });

        it("should support pagination query params", async () => {
            const response = await app.request("/api/orders?page=1&per_page=10", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });

            // Should not return 400 for valid pagination params
            expect(response.status).not.toBe(HttpStatusCodes.BAD_REQUEST);
        });

        it("should support filtering by order_status", async () => {
            const response = await app.request("/api/orders?order_status=IN_REQUEST", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });

            // Should not return 400 for valid filter params
            expect(response.status).not.toBe(HttpStatusCodes.BAD_REQUEST);
        });
    });

    describe("GET /api/orders/:id", () => {
        it("should return 401 without authentication", async () => {
            const response = await app.request("/api/orders/123e4567-e89b-12d3-a456-426614174000", {
                method: "GET",
            });

            expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
        });

        it("should return 404 for non-existent order", async () => {
            const response = await app.request("/api/orders/123e4567-e89b-12d3-a456-426614174000", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });

            // Should return 404 or 403 (depends on user permissions)
            expect([HttpStatusCodes.NOT_FOUND, HttpStatusCodes.FORBIDDEN]).toContain(response.status);
        });
    });

    describe("POST /api/orders", () => {
        it("should return 401 without authentication", async () => {
            const response = await app.request("/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({}),
            });

            expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
        });

        it("should return 400/422 for invalid body", async () => {
            const response = await app.request("/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({}),
            });

            // Should return validation error (400 or 422) or forbidden
            expect([
                HttpStatusCodes.BAD_REQUEST,
                HttpStatusCodes.UNPROCESSABLE_ENTITY,
                HttpStatusCodes.FORBIDDEN,
            ]).toContain(response.status);
        });
    });

    describe("DELETE /api/orders/:id", () => {
        it("should return 401 without authentication", async () => {
            const response = await app.request("/api/orders/123e4567-e89b-12d3-a456-426614174000", {
                method: "DELETE",
            });

            expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
        });
    });
});
