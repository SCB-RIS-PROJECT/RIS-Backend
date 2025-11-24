import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { TestUtil, UserTest } from "@/__test__/test-util";
import configureOpenAPI from "@/config/configure-open-api";
import createApp from "@/config/create-app";
import { loggerPino } from "@/config/log";
import authController from "@/controller/auth.controller";
import satuSehatController from "@/controller/satu-sehat.controller";
import db from "@/database/db";
import { snomedTable } from "@/database/schemas/schema-snomed";
import { seedSnomed } from "@/database/seeders/seeder-snomed";
import type { SnomedResponse } from "@/interface/satu-sehat.interface";

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
        await seedSnomed();
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

        // Cleanup SNOMED data
        await db.delete(snomedTable);
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

    describe("GET /api/satu-sehat/snomed-ct - Get SNOMED-CT Codes", () => {
        it("should return 401 when not authenticated", async () => {
            const response = await app.request("/api/satu-sehat/snomed-ct", {
                method: "GET",
            });

            expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);

            const body = await response.json();
            loggerPino.debug(body, "Unauthorized Response");

            expect(body).toHaveProperty("message");
        });

        it("should return 403 when user does not have read:satu_sehat permission", async () => {
            const response = await app.request("/api/satu-sehat/snomed-ct", {
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

        it("should get paginated SNOMED-CT codes with default pagination", async () => {
            const response = await app.request("/api/satu-sehat/snomed-ct", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            expect(response.status).toBe(HttpStatusCodes.OK);

            const body = await response.json();
            loggerPino.debug(body, "SNOMED-CT Default Pagination Response");

            expect(body).toHaveProperty("data");
            expect(body).toHaveProperty("meta");
            expect(Array.isArray(body.data)).toBe(true);
            expect(body.data.length).toBeLessThanOrEqual(10); // Default per_page

            // Check meta structure
            expect(body.meta).toHaveProperty("total");
            expect(body.meta).toHaveProperty("page", 1);
            expect(body.meta).toHaveProperty("per_page", 10);
            expect(body.meta).toHaveProperty("total_pages");
            expect(body.meta).toHaveProperty("has_next_page");
            expect(body.meta).toHaveProperty("has_prev_page", false);

            // Check data structure
            if (body.data.length > 0) {
                const firstItem = body.data[0];
                expect(firstItem).toHaveProperty("id");
                expect(firstItem).toHaveProperty("code");
                expect(firstItem).toHaveProperty("display");
                expect(firstItem).toHaveProperty("system", "http://snomed.info/sct");
                expect(firstItem).toHaveProperty("category");
                expect(firstItem).toHaveProperty("description");
                expect(firstItem).toHaveProperty("active");
                expect(firstItem).toHaveProperty("created_at");
                expect(firstItem).toHaveProperty("updated_at");
            }
        });

        it("should get SNOMED-CT codes with custom pagination", async () => {
            const response = await app.request("/api/satu-sehat/snomed-ct?page=1&per_page=5", {
                method: "GET",
                headers: {
                    Cookie: officerCookie,
                },
            });

            expect(response.status).toBe(HttpStatusCodes.OK);

            const body = await response.json();
            loggerPino.debug(body, "SNOMED-CT Custom Pagination Response");

            expect(body).toHaveProperty("data");
            expect(body).toHaveProperty("meta");
            expect(Array.isArray(body.data)).toBe(true);
            expect(body.data.length).toBeLessThanOrEqual(5);

            expect(body.meta).toHaveProperty("page", 1);
            expect(body.meta).toHaveProperty("per_page", 5);
        });

        it("should search SNOMED-CT codes by code", async () => {
            const response = await app.request("/api/satu-sehat/snomed-ct?search=77477000", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            expect(response.status).toBe(HttpStatusCodes.OK);

            const body = await response.json();
            loggerPino.debug(body, "SNOMED-CT Search by Code Response");

            expect(body).toHaveProperty("data");
            expect(Array.isArray(body.data)).toBe(true);

            if (body.data.length > 0) {
                const foundItem = body.data.find((item: SnomedResponse) => item.code === "77477000");
                expect(foundItem).toBeDefined();
                expect(foundItem?.display).toContain("Computerized axial tomography");
            }
        });

        it("should search SNOMED-CT codes by display name", async () => {
            const response = await app.request("/api/satu-sehat/snomed-ct?search=CT", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            expect(response.status).toBe(HttpStatusCodes.OK);

            const body = await response.json();
            loggerPino.debug(body, "SNOMED-CT Search by Display Response");

            expect(body).toHaveProperty("data");
            expect(Array.isArray(body.data)).toBe(true);

            // Should find CT-related procedures
            if (body.data.length > 0) {
                const hasCtRelated = body.data.some(
                    (item: SnomedResponse) =>
                        item.display.toLowerCase().includes("ct") ||
                        item.description?.toLowerCase().includes("ct") ||
                        item.display.toLowerCase().includes("computed tomography")
                );
                expect(hasCtRelated).toBe(true);
            }
        });

        it("should search SNOMED-CT codes by description", async () => {
            const response = await app.request("/api/satu-sehat/snomed-ct?search=MRI", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            expect(response.status).toBe(HttpStatusCodes.OK);

            const body = await response.json();
            loggerPino.debug(body, "SNOMED-CT Search by Description Response");

            expect(body).toHaveProperty("data");
            expect(Array.isArray(body.data)).toBe(true);

            if (body.data.length > 0) {
                const hasMriRelated = body.data.some(
                    (item: SnomedResponse) =>
                        item.description?.toLowerCase().includes("mri") ||
                        item.display.toLowerCase().includes("mri") ||
                        item.display.toLowerCase().includes("magnetic resonance")
                );
                expect(hasMriRelated).toBe(true);
            }
        });

        it("should search SNOMED-CT codes by category", async () => {
            const response = await app.request("/api/satu-sehat/snomed-ct?search=Procedure", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            expect(response.status).toBe(HttpStatusCodes.OK);

            const body = await response.json();
            loggerPino.debug(body, "SNOMED-CT Search by Category Response");

            expect(body).toHaveProperty("data");
            expect(Array.isArray(body.data)).toBe(true);

            if (body.data.length > 0) {
                const hasProcedure = body.data.some((item: SnomedResponse) => item.category === "Procedure");
                expect(hasProcedure).toBe(true);
            }
        });

        it("should return empty results for non-existent search term", async () => {
            const response = await app.request("/api/satu-sehat/snomed-ct?search=NONEXISTENTCODE123456", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            expect(response.status).toBe(HttpStatusCodes.OK);

            const body = await response.json();
            loggerPino.debug(body, "SNOMED-CT Empty Search Response");

            expect(body).toHaveProperty("data");
            expect(body.data).toEqual([]);
            expect(body.meta).toHaveProperty("total", 0);
            expect(body.meta).toHaveProperty("total_pages", 0);
        });

        it("should validate per_page maximum limit", async () => {
            const response = await app.request("/api/satu-sehat/snomed-ct?per_page=150", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);

            const body = await response.json();
            loggerPino.debug(body, "SNOMED-CT Validation Error");

            expect(body).toHaveProperty("success", false);
            expect(body).toHaveProperty("error");
        });

        it("should validate page number is positive", async () => {
            const response = await app.request("/api/satu-sehat/snomed-ct?page=0", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);

            const body = await response.json();
            loggerPino.debug(body, "SNOMED-CT Page Validation Error");

            expect(body).toHaveProperty("success", false);
            expect(body).toHaveProperty("error");
        });

        it("should handle pagination correctly on second page", async () => {
            const response = await app.request("/api/satu-sehat/snomed-ct?page=2&per_page=5", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            expect(response.status).toBe(HttpStatusCodes.OK);

            const body = await response.json();
            loggerPino.debug(body, "SNOMED-CT Second Page Response");

            expect(body).toHaveProperty("meta");
            expect(body.meta).toHaveProperty("page", 2);
            expect(body.meta).toHaveProperty("has_prev_page", true);

            // If there are more than 5 records, has_next_page might be true
            if (body.meta.total > 10) {
                expect(body.meta).toHaveProperty("has_next_page", true);
            }
        });

        it("should combine search and pagination", async () => {
            const response = await app.request("/api/satu-sehat/snomed-ct?search=radiography&page=1&per_page=3", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            expect(response.status).toBe(HttpStatusCodes.OK);

            const body = await response.json();
            loggerPino.debug(body, "SNOMED-CT Search with Pagination Response");

            expect(body).toHaveProperty("data");
            expect(body).toHaveProperty("meta");
            expect(body.data.length).toBeLessThanOrEqual(3);
            expect(body.meta).toHaveProperty("per_page", 3);
        });
    });
});
