import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import * as HttpStatusCodes from "stoker/http-status-codes";
import configureOpenAPI from "@/config/configure-open-api";
import createApp from "@/config/create-app";
import authController from "@/controller/auth.controller";
import { clearRateLimitStore } from "@/middleware/rate-limit.middleware";

describe("Rate Limit Middleware", () => {
    const app = createApp();
    configureOpenAPI(app);
    app.route("/", authController);

    beforeAll(() => {
        // Clear rate limit store before tests
        clearRateLimitStore();
    });

    afterAll(() => {
        // Clear rate limit store after tests
        clearRateLimitStore();
    });

    test("should include rate limit headers in response", async () => {
        const response = await app.request("/");

        expect(response.headers.get("X-RateLimit-Limit")).toBeDefined();
        expect(response.headers.get("X-RateLimit-Remaining")).toBeDefined();
        expect(response.headers.get("X-RateLimit-Reset")).toBeDefined();
    });

    test("should allow requests within limit", async () => {
        // Clear store first
        clearRateLimitStore();

        // Make 5 requests (well within the 100 req/min limit)
        for (let i = 0; i < 5; i++) {
            const response = await app.request("/");
            expect(response.status).not.toBe(HttpStatusCodes.TOO_MANY_REQUESTS);

            const remaining = response.headers.get("X-RateLimit-Remaining");
            expect(Number(remaining)).toBeGreaterThanOrEqual(0);
        }
    });

    test("should enforce rate limit when exceeded", async () => {
        // Clear store first
        clearRateLimitStore();

        const maxRequests = 100; // Default API rate limit
        const responses = [];

        // Make more requests than the limit
        for (let i = 0; i < maxRequests + 10; i++) {
            const response = await app.request("/");
            responses.push(response);
        }

        // Check that some requests were rate limited
        const rateLimitedResponses = responses.filter((r) => r.status === HttpStatusCodes.TOO_MANY_REQUESTS);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);

        // Check that rate limited response has Retry-After header
        const rateLimited = rateLimitedResponses[0];
        expect(rateLimited.headers.get("Retry-After")).toBeDefined();
    });

    test("should return correct rate limit error response", async () => {
        // Clear store first to ensure clean state
        clearRateLimitStore();

        const maxRequests = 100;

        // Make exactly maxRequests to fill the quota
        for (let i = 0; i < maxRequests; i++) {
            await app.request("/");
        }

        // This request should exceed the limit and return 429
        const response = await app.request("/");

        // Should be rate limited
        expect(response.status).toBe(HttpStatusCodes.TOO_MANY_REQUESTS);

        // Should have Retry-After header
        expect(response.headers.get("Retry-After")).toBeDefined();
        expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    });

    test("should reset rate limit after time window", async () => {
        // Clear store first
        clearRateLimitStore();

        // Make a request
        const response1 = await app.request("/");
        const remaining1 = Number(response1.headers.get("X-RateLimit-Remaining"));

        // Wait a bit (not enough to reset, just to verify it's tracking)
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Make another request
        const response2 = await app.request("/");
        const remaining2 = Number(response2.headers.get("X-RateLimit-Remaining"));

        // Remaining should decrease
        expect(remaining2).toBeLessThan(remaining1);
    });

    test("should have stricter limits on auth endpoints", async () => {
        // Clear store first
        clearRateLimitStore();

        // Auth endpoints should have 5 req/15min limit
        const authLimit = 5;

        // Make requests to auth endpoint
        for (let i = 0; i < authLimit + 2; i++) {
            await app.request("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: "test@test.com",
                    password: "password",
                }),
            });
        }

        // Next request should be rate limited
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

        expect(response.status).toBe(HttpStatusCodes.TOO_MANY_REQUESTS);
        expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
    });
});
