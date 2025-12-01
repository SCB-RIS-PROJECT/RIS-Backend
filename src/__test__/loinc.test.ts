import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { TestUtil, UserTest } from "@/__test__/test-util";
import configureOpenAPI from "@/config/configure-open-api";
import createApp from "@/config/create-app";
import { loggerPino } from "@/config/log";
import authController from "@/controller/auth.controller";
import loincController from "@/controller/loinc.controller";
import db from "@/database/db";
import { loincTable } from "@/database/schemas/schema-loinc";
import { modalityTable } from "@/database/schemas/schema-modality";

// Skip rate limiting for tests to avoid false failures
const app = createApp({ skipRateLimit: true });
configureOpenAPI(app);
app.route("/", authController);
app.route("/", loincController);

describe("LOINC CRUD", () => {
    let adminCookie: string;
    let officerCookie: string;
    let doctorCookie: string;
    let testModalityId: string;
    let loincId: string;

    beforeAll(async () => {
        // Create a test modality first (or use existing one)
        const existingModality = await db
            .select()
            .from(modalityTable)
            .where(eq(modalityTable.code, "XR-TEST-LOINC"))
            .limit(1);

        if (existingModality.length > 0) {
            testModalityId = existingModality[0].id;
        } else {
            const [modality] = await db
                .insert(modalityTable)
                .values({
                    code: "XR-TEST-LOINC",
                    name: "X-Ray Test for LOINC",
                    description: "Test modality for LOINC tests",
                    is_active: true,
                })
                .returning();

            testModalityId = modality.id;
        }

        await TestUtil.sleep(100);

        // Create users with roles
        await UserTest.createWithRole("admin@test.com", ["admin"]);
        await UserTest.createWithRole("officer@test.com", ["officer"]);
        await UserTest.createWithRole("doctor@test.com", ["doctor"]);

        await TestUtil.sleep(100);

        // Login users
        adminCookie = await UserTest.loginAs("admin@test.com");
        officerCookie = await UserTest.loginAs("officer@test.com");
        doctorCookie = await UserTest.loginAs("doctor@test.com");

        await TestUtil.sleep(100);
    });

    afterAll(async () => {
        // Cleanup LOINC records first (to avoid FK constraint violation)
        await db.delete(loincTable).where(eq(loincTable.id_modality, testModalityId));

        // Cleanup users
        await UserTest.deleteByEmail("admin@test.com");
        await UserTest.deleteByEmail("officer@test.com");
        await UserTest.deleteByEmail("doctor@test.com");

        // Cleanup test modality last (only if we created it, not if it existed before)
        // Note: We're not deleting it if it existed before the test
        // To be safe, we'll keep the modality as it might be used by other tests or seeder
    });
    describe("POST /api/loinc - Create LOINC", () => {
        it("should create LOINC with admin permission", async () => {
            const response = await app.request("/api/loinc", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: adminCookie,
                },
                body: JSON.stringify({
                    id_modality: testModalityId,
                    code: "RAD-TEST-001",
                    name: "Test Radiography",
                    loinc_code: "12345-6",
                    loinc_display: "Test XR Display",
                    loinc_system: "http://loinc.org",
                    require_fasting: false,
                    require_pregnancy_check: false,
                    require_use_contrast: false,
                }),
            });

            const body = await response.json();
            loggerPino.debug(body, "Create LOINC Response");

            expect(response.status).toBe(HttpStatusCodes.CREATED);
            expect(body.code).toBe("RAD-TEST-001");
            expect(body.name).toBe("Test Radiography");
            expect(body.loinc_code).toBe("12345-6");
            expect(body.modality).toBeDefined();
            expect(body.modality.code).toBe("XR-TEST-LOINC");

            // Save for other tests
            loincId = body.id;

            // Cleanup
            await db.delete(loincTable).where(eq(loincTable.id, loincId));
        });

        it("should create LOINC with officer permission", async () => {
            const response = await app.request("/api/loinc", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: officerCookie,
                },
                body: JSON.stringify({
                    id_modality: testModalityId,
                    code: "RAD-TEST-002",
                    name: "Test CT Scan",
                    loinc_code: "23456-7",
                    loinc_display: "Test CT Display",
                    loinc_system: "http://loinc.org",
                    require_fasting: true,
                    require_pregnancy_check: true,
                    require_use_contrast: true,
                    contrast_name: "Iohexol",
                    contrast_kfa_code: "92003638",
                }),
            });

            const body = await response.json();
            loggerPino.debug(body, "Create LOINC Officer Response");

            expect(response.status).toBe(HttpStatusCodes.CREATED);
            expect(body.code).toBe("RAD-TEST-002");
            expect(body.require_use_contrast).toBe(true);
            expect(body.contrast_name).toBe("Iohexol");

            // Cleanup
            await db.delete(loincTable).where(eq(loincTable.id, body.id));
        });

        it("should not create LOINC without create:loinc permission", async () => {
            const response = await app.request("/api/loinc", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: doctorCookie,
                },
                body: JSON.stringify({
                    id_modality: testModalityId,
                    code: "RAD-TEST-003",
                    name: "Should Not Create",
                    loinc_code: "34567-8",
                    loinc_display: "Should Not Display",
                }),
            });

            const body = await response.json();
            loggerPino.debug(body, "Forbidden Response");

            expect(response.status).toBe(HttpStatusCodes.FORBIDDEN);
            expect(body.message).toContain("Permission denied");
        });

        it("should not create LOINC without authentication", async () => {
            const response = await app.request("/api/loinc", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id_modality: testModalityId,
                    code: "RAD-TEST-004",
                    name: "No Auth Test",
                    loinc_code: "45678-9",
                    loinc_display: "No Auth Display",
                }),
            });

            const body = await response.json();
            loggerPino.debug(body, "Unauthorized Response");

            expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
            expect(body.message).toBe("Not authenticated");
        });
    });

    describe("GET /api/loinc - Get All LOINC", () => {
        it("should get all LOINC codes with pagination", async () => {
            const response = await app.request("/api/loinc?page=1&per_page=10", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Get All LOINC Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data).toBeInstanceOf(Array);
            expect(body.meta).toBeDefined();
            expect(body.meta.page).toBe(1);
            expect(body.meta.per_page).toBe(10);
            expect(body.meta).toHaveProperty("total");
            expect(body.meta).toHaveProperty("total_pages");
            expect(body.meta).toHaveProperty("has_next_page");
            expect(body.meta).toHaveProperty("has_prev_page");
        });

        it("should search LOINC by code", async () => {
            // Create test LOINC
            const [testLoinc] = await db
                .insert(loincTable)
                .values({
                    id_modality: testModalityId,
                    code: "SEARCH-CODE-001",
                    name: "Search by Code Test",
                    loinc_code: "11111-1",
                    loinc_display: "Search Code Display",
                    loinc_system: "http://loinc.org",
                })
                .returning();

            const response = await app.request("/api/loinc?search=SEARCH-CODE", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Search by Code Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data.length).toBeGreaterThan(0);
            expect(body.data[0].code).toContain("SEARCH-CODE");

            // Cleanup
            await db.delete(loincTable).where(eq(loincTable.id, testLoinc.id));
        });

        it("should search LOINC by name", async () => {
            // Create test LOINC
            const [testLoinc] = await db
                .insert(loincTable)
                .values({
                    id_modality: testModalityId,
                    code: "SEARCH-NAME-001",
                    name: "Unique Search Name Test",
                    loinc_code: "22222-2",
                    loinc_display: "Search Name Display",
                    loinc_system: "http://loinc.org",
                })
                .returning();

            const response = await app.request("/api/loinc?search=Unique Search Name", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Search by Name Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data.length).toBeGreaterThan(0);
            expect(body.data[0].name).toContain("Unique Search Name");

            // Cleanup
            await db.delete(loincTable).where(eq(loincTable.id, testLoinc.id));
        });

        it("should search LOINC by loinc_code", async () => {
            // Create test LOINC
            const [testLoinc] = await db
                .insert(loincTable)
                .values({
                    id_modality: testModalityId,
                    code: "SEARCH-LOINC-001",
                    name: "Search LOINC Code Test",
                    loinc_code: "99999-9",
                    loinc_display: "Search LOINC Display",
                    loinc_system: "http://loinc.org",
                })
                .returning();

            const response = await app.request("/api/loinc?search=99999-9", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Search by LOINC Code Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data.length).toBeGreaterThan(0);
            expect(body.data[0].loinc_code).toBe("99999-9");

            // Cleanup
            await db.delete(loincTable).where(eq(loincTable.id, testLoinc.id));
        });

        it("should filter LOINC by modality", async () => {
            const response = await app.request(`/api/loinc?id_modality=${testModalityId}`, {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Filter by Modality Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data).toBeInstanceOf(Array);
            // All results should have the same modality ID
            if (body.data.length > 0) {
                expect(body.data[0].id_modality).toBe(testModalityId);
            }
        });

        it("should sort LOINC by code ascending", async () => {
            const response = await app.request("/api/loinc?sort=code&dir=asc", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Sort Ascending Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data).toBeInstanceOf(Array);

            if (body.data.length > 1) {
                const firstLoinc = body.data[0];
                const secondLoinc = body.data[1];
                expect(firstLoinc.code.localeCompare(secondLoinc.code)).toBeLessThanOrEqual(0);
            }
        });

        it("should allow doctor to read LOINC codes", async () => {
            const response = await app.request("/api/loinc", {
                method: "GET",
                headers: {
                    Cookie: doctorCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Doctor Read Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data).toBeInstanceOf(Array);
        });
    });

    describe("GET /api/loinc/:id - Get LOINC by ID", () => {
        it("should get LOINC by id", async () => {
            // Create test LOINC
            const [testLoinc] = await db
                .insert(loincTable)
                .values({
                    id_modality: testModalityId,
                    code: "GET-BY-ID-001",
                    name: "Get By ID Test",
                    loinc_code: "33333-3",
                    loinc_display: "Get By ID Display",
                    loinc_system: "http://loinc.org",
                })
                .returning();

            const response = await app.request(`/api/loinc/${testLoinc.id}`, {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Get by ID Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.id).toBe(testLoinc.id);
            expect(body.code).toBe("GET-BY-ID-001");
            expect(body.modality).toBeDefined();
            expect(body.modality.id).toBe(testModalityId);

            // Cleanup
            await db.delete(loincTable).where(eq(loincTable.id, testLoinc.id));
        });

        it("should return 404 for non-existent LOINC", async () => {
            const response = await app.request("/api/loinc/00000000-0000-0000-0000-000000000000", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Not Found Response");

            expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
            expect(body.message).toBe("LOINC code not found");
        });
    });

    describe("PATCH /api/loinc/:id - Update LOINC", () => {
        it("should update LOINC with admin permission", async () => {
            // Create test LOINC
            const [testLoinc] = await db
                .insert(loincTable)
                .values({
                    id_modality: testModalityId,
                    code: "UPDATE-001",
                    name: "Old Name",
                    loinc_code: "44444-4",
                    loinc_display: "Old Display",
                    loinc_system: "http://loinc.org",
                })
                .returning();

            const response = await app.request(`/api/loinc/${testLoinc.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: adminCookie,
                },
                body: JSON.stringify({
                    name: "Updated Name",
                    loinc_display: "Updated Display",
                }),
            });

            const body = await response.json();
            loggerPino.debug(body, "Update Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.name).toBe("Updated Name");
            expect(body.loinc_display).toBe("Updated Display");
            expect(body.code).toBe("UPDATE-001"); // Code should remain unchanged

            // Cleanup
            await db.delete(loincTable).where(eq(loincTable.id, testLoinc.id));
        });

        it("should update LOINC contrast info", async () => {
            // Create test LOINC
            const [testLoinc] = await db
                .insert(loincTable)
                .values({
                    id_modality: testModalityId,
                    code: "UPDATE-002",
                    name: "Contrast Test",
                    loinc_code: "55555-5",
                    loinc_display: "Contrast Display",
                    loinc_system: "http://loinc.org",
                    require_use_contrast: false,
                })
                .returning();

            const response = await app.request(`/api/loinc/${testLoinc.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: officerCookie,
                },
                body: JSON.stringify({
                    require_use_contrast: true,
                    contrast_name: "Iohexol 350mg",
                    contrast_kfa_code: "92003638",
                }),
            });

            const body = await response.json();
            loggerPino.debug(body, "Update Contrast Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.require_use_contrast).toBe(true);
            expect(body.contrast_name).toBe("Iohexol 350mg");

            // Cleanup
            await db.delete(loincTable).where(eq(loincTable.id, testLoinc.id));
        });

        it("should not update LOINC without update:loinc permission", async () => {
            // Create test LOINC
            const [testLoinc] = await db
                .insert(loincTable)
                .values({
                    id_modality: testModalityId,
                    code: "UPDATE-003",
                    name: "Should Not Update",
                    loinc_code: "66666-6",
                    loinc_display: "Should Not Update Display",
                    loinc_system: "http://loinc.org",
                })
                .returning();

            const response = await app.request(`/api/loinc/${testLoinc.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: doctorCookie,
                },
                body: JSON.stringify({
                    name: "Should Not Work",
                }),
            });

            const body = await response.json();
            loggerPino.debug(body, "Forbidden Update Response");

            expect(response.status).toBe(HttpStatusCodes.FORBIDDEN);
            expect(body.message).toContain("Permission denied");

            // Cleanup
            await db.delete(loincTable).where(eq(loincTable.id, testLoinc.id));
        });

        it("should return 404 when updating non-existent LOINC", async () => {
            const response = await app.request("/api/loinc/00000000-0000-0000-0000-000000000000", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: adminCookie,
                },
                body: JSON.stringify({
                    name: "Should Not Work",
                }),
            });

            const body = await response.json();
            loggerPino.debug(body, "Update Not Found Response");

            expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
            expect(body.message).toBe("LOINC code not found");
        });
    });

    describe("DELETE /api/loinc/:id - Delete LOINC", () => {
        it("should delete LOINC with admin permission", async () => {
            // Create test LOINC
            const [testLoinc] = await db
                .insert(loincTable)
                .values({
                    id_modality: testModalityId,
                    code: "DEL-001",
                    name: "To Delete 1",
                    loinc_code: "77777-7",
                    loinc_display: "Delete Display 1",
                    loinc_system: "http://loinc.org",
                })
                .returning();

            const response = await app.request(`/api/loinc/${testLoinc.id}`, {
                method: "DELETE",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Delete Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.message).toBe("LOINC code deleted successfully");
        });

        it("should delete LOINC with officer permission", async () => {
            // Create test LOINC
            const [testLoinc] = await db
                .insert(loincTable)
                .values({
                    id_modality: testModalityId,
                    code: "DEL-002",
                    name: "To Delete 2",
                    loinc_code: "88888-8",
                    loinc_display: "Delete Display 2",
                    loinc_system: "http://loinc.org",
                })
                .returning();

            const response = await app.request(`/api/loinc/${testLoinc.id}`, {
                method: "DELETE",
                headers: {
                    Cookie: officerCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Delete Officer Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.message).toBe("LOINC code deleted successfully");
        });

        it("should not delete LOINC without delete:loinc permission", async () => {
            // Create test LOINC
            const [testLoinc] = await db
                .insert(loincTable)
                .values({
                    id_modality: testModalityId,
                    code: "DEL-003",
                    name: "Should Not Delete",
                    loinc_code: "00000-0",
                    loinc_display: "Should Not Delete Display",
                    loinc_system: "http://loinc.org",
                })
                .returning();

            const response = await app.request(`/api/loinc/${testLoinc.id}`, {
                method: "DELETE",
                headers: {
                    Cookie: doctorCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Forbidden Delete Response");

            expect(response.status).toBe(HttpStatusCodes.FORBIDDEN);
            expect(body.message).toContain("Permission denied");

            // Cleanup
            await db.delete(loincTable).where(eq(loincTable.id, testLoinc.id));
        });

        it("should return 404 when deleting non-existent LOINC", async () => {
            const response = await app.request("/api/loinc/00000000-0000-0000-0000-000000000000", {
                method: "DELETE",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Delete Not Found Response");

            expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
            expect(body.message).toBe("LOINC code not found");
        });
    });
});
