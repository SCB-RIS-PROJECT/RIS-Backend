import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { TestUtil, UserTest } from "@/__test__/test-util";
import configureOpenAPI from "@/config/configure-open-api";
import createApp from "@/config/create-app";
import { loggerPino } from "@/config/log";
import authController from "@/controller/auth.controller";
import practitionerController from "@/controller/practitioner.controller";
import db from "@/database/db";
import { practitionerTable } from "@/database/schemas/schema-practitioner";

const app = createApp();
configureOpenAPI(app);
app.route("/", authController);
app.route("/", practitionerController);

describe("Practitioner CRUD", () => {
    let adminCookie: string;
    let officerCookie: string;
    let doctorCookie: string;
    let practitionerId: string;

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

    describe("POST /api/practitioners - Create Practitioner", () => {
        it("should create practitioner with admin permission", async () => {
            const response = await app.request("/api/practitioners", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: adminCookie,
                },
                body: JSON.stringify({
                    nik: "1234567890123456",
                    name: "Dr. John Doe",
                    gender: "MALE",
                    birth_date: "1980-01-01T00:00:00.000Z",
                    profession: "DOCTOR",
                    phone: "081234567890",
                    email: "dr.john@example.com",
                    active: true,
                }),
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.CREATED);
            expect(body.name).toBe("Dr. John Doe");
            expect(body.nik).toBe("1234567890123456");
            expect(body.profession).toBe("DOCTOR");
            expect(body.gender).toBe("MALE");
            expect(body.active).toBe(true);

            // Save for other tests
            practitionerId = body.id;

            // Cleanup
            await db.delete(practitionerTable).where(eq(practitionerTable.id, practitionerId));
        });

        it("should create practitioner with officer permission", async () => {
            const response = await app.request("/api/practitioners", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: officerCookie,
                },
                body: JSON.stringify({
                    nik: "9876543210987654",
                    name: "Nurse Jane",
                    gender: "FEMALE",
                    birth_date: "1985-05-15T00:00:00.000Z",
                    profession: "NURSE",
                    active: true,
                }),
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.CREATED);
            expect(body.name).toBe("Nurse Jane");
            expect(body.profession).toBe("NURSE");

            // Cleanup
            await db.delete(practitionerTable).where(eq(practitionerTable.id, body.id));
        });

        it("should not create practitioner without create:practitioner permission", async () => {
            const response = await app.request("/api/practitioners", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: doctorCookie,
                },
                body: JSON.stringify({
                    nik: "1111111111111111",
                    name: "Test Practitioner",
                    gender: "MALE",
                    birth_date: "1990-01-01T00:00:00.000Z",
                    profession: "PHARMACIST",
                    active: true,
                }),
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.FORBIDDEN);
            expect(body.message).toContain("Permission denied");
        });
    });

    describe("GET /api/practitioners - Get All Practitioners", () => {
        it("should get all practitioners with pagination", async () => {
            const response = await app.request("/api/practitioners?page=1&per_page=10", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data).toBeInstanceOf(Array);
            expect(body.meta).toBeDefined();
            expect(body.meta.page).toBe(1);
            expect(body.meta.per_page).toBe(10);
        });

        it("should search practitioners by name", async () => {
            // Create test practitioner
            const [testPractitioner] = await db
                .insert(practitionerTable)
                .values({
                    nik: "1111111111111111",
                    name: "Test Practitioner Search",
                    gender: "MALE",
                    birth_date: new Date("1990-01-01"),
                    profession: "DOCTOR",
                    active: true,
                })
                .returning();

            const response = await app.request("/api/practitioners?search=Test Practitioner Search", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data.length).toBeGreaterThan(0);
            expect(body.data[0].name).toContain("Test Practitioner Search");

            // Cleanup
            await db.delete(practitionerTable).where(eq(practitionerTable.id, testPractitioner.id));
        });

        it("should filter practitioners by profession", async () => {
            const response = await app.request("/api/practitioners?profession=DOCTOR", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data).toBeInstanceOf(Array);
            for (const practitioner of body.data) {
                expect(practitioner.profession).toBe("DOCTOR");
            }
        });

        it("should filter practitioners by active status", async () => {
            const response = await app.request("/api/practitioners?active=true", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data).toBeInstanceOf(Array);
            for (const practitioner of body.data) {
                expect(practitioner.active).toBe(true);
            }
        });

        it("should sort practitioners by name ascending", async () => {
            const response = await app.request("/api/practitioners?sort=name&dir=asc", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data).toBeInstanceOf(Array);

            if (body.data.length > 1) {
                const firstPractitioner = body.data[0];
                const secondPractitioner = body.data[1];
                expect(firstPractitioner.name.localeCompare(secondPractitioner.name)).toBeLessThanOrEqual(0);
            }
        });

        it("should allow doctor to read practitioners", async () => {
            const response = await app.request("/api/practitioners", {
                method: "GET",
                headers: {
                    Cookie: doctorCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data).toBeInstanceOf(Array);
        });

        it("should not get practitioners without authentication", async () => {
            const response = await app.request("/api/practitioners", {
                method: "GET",
                headers: {},
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
            expect(body.message).toBe("Not authenticated");
        });
    });

    describe("GET /api/practitioners/:id - Get Practitioner by ID", () => {
        it("should get practitioner by id", async () => {
            // Create test practitioner
            const [testPractitioner] = await db
                .insert(practitionerTable)
                .values({
                    nik: "3333333333333333",
                    name: "Test Practitioner 3",
                    gender: "MALE",
                    birth_date: new Date("1985-03-20"),
                    profession: "PHARMACIST",
                    active: true,
                })
                .returning();

            const response = await app.request(`/api/practitioners/${testPractitioner.id}`, {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body.name, body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.id).toBe(testPractitioner.id);
            expect(body.name).toBe("Test Practitioner 3");

            // Cleanup
            await db.delete(practitionerTable).where(eq(practitionerTable.id, testPractitioner.id));
        });

        it("should return 404 for non-existent practitioner", async () => {
            const response = await app.request("/api/practitioners/00000000-0000-0000-0000-000000000000", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
            expect(body.message).toBe("Practitioner not found");
        });
    });

    describe("PATCH /api/practitioners/:id - Update Practitioner", () => {
        it("should update practitioner with admin permission", async () => {
            // Create test practitioner
            const [testPractitioner] = await db
                .insert(practitionerTable)
                .values({
                    nik: "4444444444444444",
                    name: "Old Name",
                    gender: "FEMALE",
                    birth_date: new Date("1988-08-08"),
                    profession: "NURSE",
                    active: true,
                })
                .returning();

            const response = await app.request(`/api/practitioners/${testPractitioner.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: adminCookie,
                },
                body: JSON.stringify({
                    name: "Updated Name",
                    phone: "081999999999",
                }),
            });

            const body = await response.json();
            loggerPino.debug(body.name, body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.name).toBe("Updated Name");
            expect(body.phone).toBe("081999999999");

            // Cleanup
            await db.delete(practitionerTable).where(eq(practitionerTable.id, testPractitioner.id));
        });

        it("should update practitioner with officer permission", async () => {
            // Create test practitioner
            const [testPractitioner] = await db
                .insert(practitionerTable)
                .values({
                    nik: "4444444444444444",
                    name: "Old Name",
                    gender: "FEMALE",
                    birth_date: new Date("1988-08-08"),
                    profession: "NURSE",
                    active: true,
                })
                .returning();

            const response = await app.request(`/api/practitioners/${testPractitioner.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: officerCookie,
                },
                body: JSON.stringify({
                    email: "updated@example.com",
                }),
            });

            const body = await response.json();
            loggerPino.debug(body.name, body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.email).toBe("updated@example.com");

            // Cleanup
            await db.delete(practitionerTable).where(eq(practitionerTable.id, testPractitioner.id));
        });

        it("should not update practitioner without update:practitioner permission", async () => {
            // Create test practitioner
            const [testPractitioner] = await db
                .insert(practitionerTable)
                .values({
                    nik: "5555555555555555",
                    name: "Test Practitioner",
                    gender: "MALE",
                    birth_date: new Date("1990-01-01"),
                    profession: "DOCTOR",
                    active: true,
                })
                .returning();

            const response = await app.request(`/api/practitioners/${testPractitioner.id}`, {
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
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.FORBIDDEN);
            expect(body.message).toContain("Permission denied");

            // Cleanup
            await db.delete(practitionerTable).where(eq(practitionerTable.id, testPractitioner.id));
        });

        it("should return 404 when updating non-existent practitioner", async () => {
            const response = await app.request("/api/practitioners/00000000-0000-0000-0000-000000000000", {
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
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
            expect(body.message).toBe("Practitioner not found");
        });
    });

    describe("DELETE /api/practitioners/:id - Delete Practitioner", () => {
        it("should delete practitioner with admin permission", async () => {
            // Create test practitioner
            const [testPractitioner] = await db
                .insert(practitionerTable)
                .values({
                    nik: "6666666666666666",
                    name: "To Delete",
                    gender: "MALE",
                    birth_date: new Date("1990-01-01"),
                    profession: "DOCTOR",
                    active: true,
                })
                .returning();

            const response = await app.request(`/api/practitioners/${testPractitioner.id}`, {
                method: "DELETE",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.message).toBe("Practitioner deleted successfully");
        });

        it("should delete practitioner with officer permission", async () => {
            // Create test practitioner
            const [testPractitioner] = await db
                .insert(practitionerTable)
                .values({
                    nik: "7777777777777777",
                    name: "To Delete 2",
                    gender: "FEMALE",
                    birth_date: new Date("1990-01-01"),
                    profession: "NURSE",
                    active: true,
                })
                .returning();

            const response = await app.request(`/api/practitioners/${testPractitioner.id}`, {
                method: "DELETE",
                headers: {
                    Cookie: officerCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.message).toBe("Practitioner deleted successfully");
        });

        it("should not delete practitioner without delete:practitioner permission", async () => {
            // Create test practitioner
            const [testPractitioner] = await db
                .insert(practitionerTable)
                .values({
                    nik: "8888888888888888",
                    name: "Should Not Delete",
                    gender: "MALE",
                    birth_date: new Date("1990-01-01"),
                    profession: "PHARMACIST",
                    active: true,
                })
                .returning();

            const response = await app.request(`/api/practitioners/${testPractitioner.id}`, {
                method: "DELETE",
                headers: {
                    Cookie: doctorCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.FORBIDDEN);
            expect(body.message).toContain("Permission denied");

            // Cleanup
            await db.delete(practitionerTable).where(eq(practitionerTable.id, testPractitioner.id));
        });

        it("should return 404 when deleting non-existent practitioner", async () => {
            const response = await app.request("/api/practitioners/00000000-0000-0000-0000-000000000000", {
                method: "DELETE",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
            expect(body.message).toBe("Practitioner not found");
        });
    });
});
