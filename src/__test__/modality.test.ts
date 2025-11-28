import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { TestUtil, UserTest } from "@/__test__/test-util";
import configureOpenAPI from "@/config/configure-open-api";
import createApp from "@/config/create-app";
import { loggerPino } from "@/config/log";
import authController from "@/controller/auth.controller";
import modalityController from "@/controller/modality.controller";
import db from "@/database/db";
import { modalityTable } from "@/database/schemas/schema-modality";

const app = createApp();
configureOpenAPI(app);
app.route("/", authController);
app.route("/", modalityController);

describe("Modality CRUD", () => {
    let adminCookie: string;
    let officerCookie: string;
    let doctorCookie: string;
    let modalityId: string;

    beforeAll(async () => {
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
        // Cleanup
        await UserTest.deleteByEmail("admin@test.com");
        await UserTest.deleteByEmail("officer@test.com");
        await UserTest.deleteByEmail("doctor@test.com");
    });

    describe("POST /api/modalities - Create Modality", () => {
        it("should create modality with admin permission", async () => {
            const response = await app.request("/api/modalities", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: adminCookie,
                },
                body: JSON.stringify({
                    code: "XR-TEST",
                    name: "X-Ray Test",
                    description: "Radiografi konvensional",
                    is_active: true,
                }),
            });

            const body = await response.json();
            loggerPino.debug(body, "Create Modality Response");

            expect(response.status).toBe(HttpStatusCodes.CREATED);
            expect(body.code).toBe("XR-TEST");
            expect(body.name).toBe("X-Ray Test");
            expect(body.description).toBe("Radiografi konvensional");
            expect(body.is_active).toBe(true);

            // Save for other tests
            modalityId = body.id;

            // Cleanup
            await db.delete(modalityTable).where(eq(modalityTable.id, modalityId));
        });

        it("should create modality with officer permission", async () => {
            const response = await app.request("/api/modalities", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: officerCookie,
                },
                body: JSON.stringify({
                    code: "US-TEST",
                    name: "Ultrasound Test",
                    description: "USG",
                    is_active: true,
                }),
            });

            const body = await response.json();
            loggerPino.debug(body, "Create Modality Officer Response");

            expect(response.status).toBe(HttpStatusCodes.CREATED);
            expect(body.code).toBe("US-TEST");
            expect(body.name).toBe("Ultrasound Test");

            // Cleanup
            await db.delete(modalityTable).where(eq(modalityTable.id, body.id));
        });

        it("should not create modality without create:modality permission", async () => {
            const response = await app.request("/api/modalities", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: doctorCookie,
                },
                body: JSON.stringify({
                    code: "CT",
                    name: "CT Scan",
                    description: "Computed Tomography",
                    is_active: true,
                }),
            });

            const body = await response.json();
            loggerPino.debug(body, "Forbidden Response");

            expect(response.status).toBe(HttpStatusCodes.FORBIDDEN);
            expect(body.message).toContain("Permission denied");
        });

        it("should not create modality without authentication", async () => {
            const response = await app.request("/api/modalities", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    code: "MR",
                    name: "MRI",
                    is_active: true,
                }),
            });

            const body = await response.json();
            loggerPino.debug(body, "Unauthorized Response");

            expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
            expect(body.message).toBe("Not authenticated");
        });
    });

    describe("GET /api/modalities - Get All Modalities", () => {
        it("should get all modalities with pagination", async () => {
            const response = await app.request("/api/modalities?page=1&per_page=10", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Get All Modalities Response");

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

        it("should search modalities by code", async () => {
            // Create test modality
            const [testModality] = await db
                .insert(modalityTable)
                .values({
                    code: "XR-TEST",
                    name: "X-Ray Test",
                    description: "Test modality",
                    is_active: true,
                })
                .returning();

            const response = await app.request("/api/modalities?search=XR-TEST", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Search by Code Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data.length).toBeGreaterThan(0);
            expect(body.data[0].code).toContain("XR-TEST");

            // Cleanup
            await db.delete(modalityTable).where(eq(modalityTable.id, testModality.id));
        });

        it("should search modalities by name", async () => {
            // Create test modality
            const [testModality] = await db
                .insert(modalityTable)
                .values({
                    code: "TEST-US",
                    name: "Ultrasound Test Search",
                    description: "Test modality",
                    is_active: true,
                })
                .returning();

            const response = await app.request("/api/modalities?search=Ultrasound Test", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Search by Name Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data.length).toBeGreaterThan(0);
            expect(body.data[0].name).toContain("Ultrasound Test");

            // Cleanup
            await db.delete(modalityTable).where(eq(modalityTable.id, testModality.id));
        });

        it("should sort modalities by code ascending", async () => {
            const response = await app.request("/api/modalities?sort=code&dir=asc", {
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
                const firstModality = body.data[0];
                const secondModality = body.data[1];
                expect(firstModality.code.localeCompare(secondModality.code)).toBeLessThanOrEqual(0);
            }
        });

        it("should sort modalities by name descending", async () => {
            const response = await app.request("/api/modalities?sort=name&dir=desc", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Sort Descending Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data).toBeInstanceOf(Array);

            if (body.data.length > 1) {
                const firstModality = body.data[0];
                const secondModality = body.data[1];
                expect(firstModality.name.localeCompare(secondModality.name)).toBeGreaterThanOrEqual(0);
            }
        });

        it("should allow doctor to read modalities", async () => {
            const response = await app.request("/api/modalities", {
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

    describe("GET /api/modalities/:id - Get Modality by ID", () => {
        it("should get modality by id", async () => {
            // Create test modality
            const [testModality] = await db
                .insert(modalityTable)
                .values({
                    code: "CT-TEST",
                    name: "CT Scan Test",
                    description: "Test CT modality",
                    is_active: true,
                })
                .returning();

            const response = await app.request(`/api/modalities/${testModality.id}`, {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Get by ID Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.id).toBe(testModality.id);
            expect(body.code).toBe("CT-TEST");
            expect(body.name).toBe("CT Scan Test");

            // Cleanup
            await db.delete(modalityTable).where(eq(modalityTable.id, testModality.id));
        });

        it("should return 404 for non-existent modality", async () => {
            const response = await app.request("/api/modalities/00000000-0000-0000-0000-000000000000", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Not Found Response");

            expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
            expect(body.message).toBe("Modality not found");
        });
    });

    describe("PATCH /api/modalities/:id - Update Modality", () => {
        it("should update modality with admin permission", async () => {
            // Create test modality
            const [testModality] = await db
                .insert(modalityTable)
                .values({
                    code: "MR-OLD",
                    name: "Old MRI",
                    description: "Old description",
                    is_active: true,
                })
                .returning();

            const response = await app.request(`/api/modalities/${testModality.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: adminCookie,
                },
                body: JSON.stringify({
                    name: "Updated MRI",
                    description: "Updated description",
                }),
            });

            const body = await response.json();
            loggerPino.debug(body, "Update Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.name).toBe("Updated MRI");
            expect(body.description).toBe("Updated description");
            expect(body.code).toBe("MR-OLD"); // Code should remain unchanged

            // Cleanup
            await db.delete(modalityTable).where(eq(modalityTable.id, testModality.id));
        });

        it("should update modality is_active status", async () => {
            // Create test modality
            const [testModality] = await db
                .insert(modalityTable)
                .values({
                    code: "DX-TEST",
                    name: "Digital X-Ray",
                    is_active: true,
                })
                .returning();

            const response = await app.request(`/api/modalities/${testModality.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: officerCookie,
                },
                body: JSON.stringify({
                    is_active: false,
                }),
            });

            const body = await response.json();
            loggerPino.debug(body, "Update Status Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.is_active).toBe(false);

            // Cleanup
            await db.delete(modalityTable).where(eq(modalityTable.id, testModality.id));
        });

        it("should not update modality without update:modality permission", async () => {
            // Create test modality
            const [testModality] = await db
                .insert(modalityTable)
                .values({
                    code: "RF-TEST",
                    name: "Fluoroscopy Test",
                    is_active: true,
                })
                .returning();

            const response = await app.request(`/api/modalities/${testModality.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: doctorCookie,
                },
                body: JSON.stringify({
                    name: "Should Not Update",
                }),
            });

            const body = await response.json();
            loggerPino.debug(body, "Forbidden Update Response");

            expect(response.status).toBe(HttpStatusCodes.FORBIDDEN);
            expect(body.message).toContain("Permission denied");

            // Cleanup
            await db.delete(modalityTable).where(eq(modalityTable.id, testModality.id));
        });

        it("should return 404 when updating non-existent modality", async () => {
            const response = await app.request("/api/modalities/00000000-0000-0000-0000-000000000000", {
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
            expect(body.message).toBe("Modality not found");
        });
    });

    describe("DELETE /api/modalities/:id - Delete Modality", () => {
        it("should delete modality with admin permission", async () => {
            // Create test modality
            const [testModality] = await db
                .insert(modalityTable)
                .values({
                    code: "DEL-1",
                    name: "To Delete 1",
                    is_active: true,
                })
                .returning();

            const response = await app.request(`/api/modalities/${testModality.id}`, {
                method: "DELETE",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Delete Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.message).toBe("Modality deleted successfully");
        });

        it("should delete modality with officer permission", async () => {
            // Create test modality
            const [testModality] = await db
                .insert(modalityTable)
                .values({
                    code: "DEL-2",
                    name: "To Delete 2",
                    is_active: true,
                })
                .returning();

            const response = await app.request(`/api/modalities/${testModality.id}`, {
                method: "DELETE",
                headers: {
                    Cookie: officerCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Delete Officer Response");

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.message).toBe("Modality deleted successfully");
        });

        it("should not delete modality without delete:modality permission", async () => {
            // Create test modality
            const [testModality] = await db
                .insert(modalityTable)
                .values({
                    code: "DEL-3",
                    name: "Should Not Delete",
                    is_active: true,
                })
                .returning();

            const response = await app.request(`/api/modalities/${testModality.id}`, {
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
            await db.delete(modalityTable).where(eq(modalityTable.id, testModality.id));
        });

        it("should return 404 when deleting non-existent modality", async () => {
            const response = await app.request("/api/modalities/00000000-0000-0000-0000-000000000000", {
                method: "DELETE",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body, "Delete Not Found Response");

            expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
            expect(body.message).toBe("Modality not found");
        });
    });
});
