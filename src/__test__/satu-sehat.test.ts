import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { TestUtil, UserTest } from "@/__test__/test-util";
import configureOpenAPI from "@/config/configure-open-api";
import createApp from "@/config/create-app";
import { loggerPino } from "@/config/log";
import authController from "@/controller/auth.controller";
import satuSehatController from "@/controller/satu-sehat.controller";

const app = createApp();
configureOpenAPI(app);
app.route("/", authController);
app.route("/", satuSehatController);

describe("Satu Sehat Integration", () => {
    let adminCookie: string;
    let officerCookie: string;
    let userWithoutPermissionCookie: string;

    beforeAll(async () => {
        // Seed SNOMED-CT codes for testing
        await TestUtil.sleep(100);

        // Create users with roles
        await UserTest.createWithRole("admin@test.com", ["admin"]);
        await UserTest.createWithRole("officer@test.com", ["officer"]);
        // Create user without satu_sehat permission
        await UserTest.createWithRole("user@test.com", []);

        await TestUtil.sleep(100);

        // Login users
        adminCookie = await UserTest.loginAs("admin@test.com");
        officerCookie = await UserTest.loginAs("officer@test.com");
        userWithoutPermissionCookie = await UserTest.loginAs("user@test.com");

        await TestUtil.sleep(100);
    });

    afterAll(async () => {
        // Cleanup
        await UserTest.deleteByEmail("admin@test.com");
        await UserTest.deleteByEmail("officer@test.com");
        await UserTest.deleteByEmail("user@test.com");
    });

    describe("Authentication & Authorization", () => {
        it("should return 401 when not authenticated - IHS Patient", async () => {
            const nik = "9104025209000006";

            const response = await app.request(`/api/satu-sehat/ihs-patient/${nik}`, {
                method: "GET",
            });

            expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);

            const body = await response.json();
            loggerPino.debug(body, "Unauthorized Response");

            expect(body).toHaveProperty("message");
        });

        it("should return 401 when not authenticated - IHS Practitioner", async () => {
            const nik = "3322071302900002";

            const response = await app.request(`/api/satu-sehat/ihs-practitioner/${nik}`, {
                method: "GET",
            });

            expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);

            const body = await response.json();
            loggerPino.debug(body, "Unauthorized Response");

            expect(body).toHaveProperty("message");
        });

        it("should return 403 when user does not have read:satu_sehat permission", async () => {
            const nik = "9104025209000006";

            const response = await app.request(`/api/satu-sehat/ihs-patient/${nik}`, {
                method: "GET",
                headers: {
                    Cookie: userWithoutPermissionCookie,
                },
            });

            expect(response.status).toBe(HttpStatusCodes.FORBIDDEN);

            const body = await response.json();
            loggerPino.debug(body, "Forbidden Response");

            expect(body).toHaveProperty("message");
        });

        it("should allow access with admin role (has read:satu_sehat permission)", async () => {
            const nik = "9104025209000006";

            const response = await app.request(`/api/satu-sehat/ihs-patient/${nik}`, {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            expect(response.status).toBe(HttpStatusCodes.OK);

            const body = await response.json();
            loggerPino.debug(body, "Admin Access Success");

            expect(body).toHaveProperty("resourceType", "Bundle");
        });

        it("should allow access with officer role (has read:satu_sehat permission)", async () => {
            const nik = "3322071302900002";

            const response = await app.request(`/api/satu-sehat/ihs-practitioner/${nik}`, {
                method: "GET",
                headers: {
                    Cookie: officerCookie,
                },
            });

            expect(response.status).toBe(HttpStatusCodes.OK);

            const body = await response.json();
            loggerPino.debug(body, "Officer Access Success");

            expect(body).toHaveProperty("resourceType", "Bundle");
        });
    });

    describe("GET /api/satu-sehat/ihs-patient/:nik - Get IHS Patient", () => {
        it("should get IHS patient data by valid NIK with admin permission", async () => {
            // Using a known NIK from staging environment
            const nik = "9104025209000006";

            const response = await app.request(`/api/satu-sehat/ihs-patient/${nik}`, {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            expect(response.status).toBe(HttpStatusCodes.OK);

            const body = await response.json();
            loggerPino.debug(body, "IHS Patient Response");

            expect(body).toHaveProperty("resourceType", "Bundle");
            expect(body).toHaveProperty("total");
            expect(body.total).toBeGreaterThan(0);
            expect(body).toHaveProperty("entry");
            expect(Array.isArray(body.entry)).toBe(true);
            expect(body.entry.length).toBeGreaterThan(0);

            // Check first entry
            const firstEntry = body.entry[0];
            expect(firstEntry).toHaveProperty("resource");
            expect(firstEntry.resource).toHaveProperty("resourceType", "Patient");
            expect(firstEntry.resource).toHaveProperty("id");
            expect(firstEntry.resource).toHaveProperty("identifier");
            expect(firstEntry.resource).toHaveProperty("name");
        });

        it("should return validation error for invalid NIK length", async () => {
            const invalidNik = "123"; // Too short

            const response = await app.request(`/api/satu-sehat/ihs-patient/${invalidNik}`, {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);

            const body = await response.json();
            loggerPino.debug(body, "Validation Error");

            expect(body).toHaveProperty("success", false);
            expect(body).toHaveProperty("error");
            expect(body.error).toHaveProperty("issues");
            expect(body.error.issues[0].message).toContain("NIK must be exactly 16 characters");
        });

        it("should handle NIK not found gracefully", async () => {
            // Using a NIK that might not exist or return empty results
            const nik = "0000000000000000";

            const response = await app.request(`/api/satu-sehat/ihs-patient/${nik}`, {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            // Could be OK with empty results or NOT_FOUND
            expect([HttpStatusCodes.OK, HttpStatusCodes.NOT_FOUND]).toContain(response.status);

            const body = await response.json();
            loggerPino.debug(body, "Empty or Not Found Response");

            if (response.status === HttpStatusCodes.OK) {
                expect(body).toHaveProperty("resourceType", "Bundle");
                expect(body).toHaveProperty("total");
                // May have 0 or more results
            } else {
                expect(body).toHaveProperty("message");
            }
        });
    });

    describe("GET /api/satu-sehat/ihs-practitioner/:nik - Get IHS Practitioner", () => {
        it("should get IHS practitioner data by valid NIK with officer permission", async () => {
            // Using a known NIK from staging environment
            const nik = "3322071302900002";

            const response = await app.request(`/api/satu-sehat/ihs-practitioner/${nik}`, {
                method: "GET",
                headers: {
                    Cookie: officerCookie,
                },
            });

            expect(response.status).toBe(HttpStatusCodes.OK);

            const body = await response.json();
            loggerPino.debug(body, "IHS Practitioner Response");

            expect(body).toHaveProperty("resourceType", "Bundle");
            expect(body).toHaveProperty("total");
            expect(body.total).toBeGreaterThan(0);
            expect(body).toHaveProperty("entry");
            expect(Array.isArray(body.entry)).toBe(true);
            expect(body.entry.length).toBeGreaterThan(0);

            // Check first entry
            const firstEntry = body.entry[0];
            expect(firstEntry).toHaveProperty("resource");
            expect(firstEntry.resource).toHaveProperty("resourceType", "Practitioner");
            expect(firstEntry.resource).toHaveProperty("id");
            expect(firstEntry.resource).toHaveProperty("identifier");
            expect(firstEntry.resource).toHaveProperty("name");
        });

        it("should return validation error for invalid NIK length", async () => {
            const invalidNik = "12345"; // Too short

            const response = await app.request(`/api/satu-sehat/ihs-practitioner/${invalidNik}`, {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);

            const body = await response.json();
            loggerPino.debug(body, "Validation Error");

            expect(body).toHaveProperty("success", false);
            expect(body).toHaveProperty("error");
            expect(body.error).toHaveProperty("issues");
            expect(body.error.issues[0].message).toContain("NIK must be exactly 16 characters");
        });

        it("should handle NIK not found gracefully", async () => {
            // Using a NIK that might not exist or return empty results
            const nik = "9999999999999999";

            const response = await app.request(`/api/satu-sehat/ihs-practitioner/${nik}`, {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            // Could be OK with empty results or NOT_FOUND
            expect([HttpStatusCodes.OK, HttpStatusCodes.NOT_FOUND]).toContain(response.status);

            const body = await response.json();
            loggerPino.debug(body, "Empty or Not Found Response");

            if (response.status === HttpStatusCodes.OK) {
                expect(body).toHaveProperty("resourceType", "Bundle");
                expect(body).toHaveProperty("total");
                // May have 0 or more results
            } else {
                expect(body).toHaveProperty("message");
            }
        });
    });

    describe("Token Management", () => {
        it("should successfully get and cache access token", async () => {
            // This test indirectly verifies token management by making API calls
            const nik = "9104025209000006";

            // First request - should get new token
            const response1 = await app.request(`/api/satu-sehat/ihs-patient/${nik}`, {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            expect(response1.status).toBe(HttpStatusCodes.OK);

            // Second request - should use cached token
            const response2 = await app.request(`/api/satu-sehat/ihs-patient/${nik}`, {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            expect(response2.status).toBe(HttpStatusCodes.OK);

            // Both should return the same structure
            const body1 = await response1.json();
            const body2 = await response2.json();

            expect(body1).toHaveProperty("resourceType", "Bundle");
            expect(body2).toHaveProperty("resourceType", "Bundle");
        });
    });
});
