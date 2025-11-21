import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { TestUtil, UserTest } from "@/__test__/test-util";
import configureOpenAPI from "@/config/configure-open-api";
import createApp from "@/config/create-app";
import { loggerPino } from "@/config/log";
import authController from "@/controller/auth.controller";
import patientController from "@/controller/patient.controller";
import db from "@/database/db";
import { patientTable } from "@/database/schemas/schema-patient";

const app = createApp();
configureOpenAPI(app);
app.route("/", authController);
app.route("/", patientController);

describe("Patient CRUD", () => {
    let adminCookie: string;
    let officerCookie: string;
    let doctorCookie: string;
    let patientId: string;

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

    describe("POST /api/patients - Create Patient", () => {
        afterEach(async () => {
            // Cleanup created patients
            await db.delete(patientTable).where(eq(patientTable.nik, "1234567890123456"));
            await TestUtil.sleep(50);
        });

        it("should create patient with admin permission", async () => {
            const response = await app.request("/api/patients", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: adminCookie,
                },
                body: JSON.stringify({
                    nik: "1234567890123456",
                    name: "John Doe",
                    gender: "MALE",
                    birth_date: "1990-01-01T00:00:00.000Z",
                    phone: "081234567890",
                    email: "john.doe@example.com",
                }),
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.CREATED);
            expect(body.name).toBe("John Doe");
            expect(body.nik).toBe("1234567890123456");
            expect(body.mrn).toBeDefined();
            expect(body.gender).toBe("MALE");

            // Save for other tests
            patientId = body.id;
        });

        it("should create patient with officer permission", async () => {
            const response = await app.request("/api/patients", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: officerCookie,
                },
                body: JSON.stringify({
                    nik: "1234567890123456",
                    name: "Jane Doe",
                    gender: "FEMALE",
                    birth_date: "1992-05-15T00:00:00.000Z",
                }),
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.CREATED);
            expect(body.name).toBe("Jane Doe");
        });

        it("should not create patient without create:patient permission", async () => {
            const response = await app.request("/api/patients", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: doctorCookie,
                },
                body: JSON.stringify({
                    nik: "1234567890123456",
                    name: "Jane Doe",
                    gender: "FEMALE",
                    birth_date: "1992-05-15T00:00:00.000Z",
                }),
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.FORBIDDEN);
            expect(body.message).toContain("Permission denied");
        });

        it("should not create patient with invalid data", async () => {
            const response = await app.request("/api/patients", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: adminCookie,
                },
                body: JSON.stringify({
                    nik: "123", // Invalid NIK (too short)
                    name: "",
                    gender: "INVALID",
                }),
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
            expect(body.error).toBeDefined();
        });

        it("should not create patient without authentication", async () => {
            const response = await app.request("/api/patients", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    nik: "1234567890123456",
                    name: "John Doe",
                    gender: "MALE",
                    birth_date: "1990-01-01T00:00:00.000Z",
                }),
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
            expect(body.message).toBe("Not authenticated");
        });
    });

    describe("GET /api/patients - Get All Patients", () => {
        beforeEach(async () => {
            // Create test patients
            await db.insert(patientTable).values([
                {
                    mrn: "240001",
                    nik: "1111111111111111",
                    name: "Test Patient 1",
                    gender: "MALE",
                    birth_date: new Date("1990-01-01"),
                },
                {
                    mrn: "240002",
                    nik: "2222222222222222",
                    name: "Test Patient 2",
                    gender: "FEMALE",
                    birth_date: new Date("1995-05-15"),
                },
            ]);
            await TestUtil.sleep(50);
        });

        afterEach(async () => {
            await db.delete(patientTable).where(eq(patientTable.nik, "1111111111111111"));
            await db.delete(patientTable).where(eq(patientTable.nik, "2222222222222222"));
            await TestUtil.sleep(50);
        });

        it("should get all patients with pagination", async () => {
            const response = await app.request("/api/patients?page=1&per_page=10", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data).toBeDefined();
            expect(Array.isArray(body.data)).toBe(true);
            expect(body.meta).toBeDefined();
            expect(body.meta.page).toBe(1);
            expect(body.meta.per_page).toBe(10);
        });

        it("should search patients by name", async () => {
            const response = await app.request("/api/patients?search=Test Patient 1", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data.length).toBeGreaterThan(0);
            expect(body.data[0].name).toContain("Test Patient 1");
        });

        it("should sort patients by name ascending", async () => {
            const response = await app.request("/api/patients?sort=name&dir=asc", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data).toBeDefined();
        });

        it("should allow doctor to read patients", async () => {
            const response = await app.request("/api/patients", {
                method: "GET",
                headers: {
                    Cookie: doctorCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.data).toBeDefined();
        });

        it("should not get patients without authentication", async () => {
            const response = await app.request("/api/patients", {
                method: "GET",
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
            expect(body.message).toBe("Not authenticated");
        });
    });

    describe("GET /api/patients/:id - Get Patient by ID", () => {
        beforeEach(async () => {
            const [patient] = await db
                .insert(patientTable)
                .values({
                    mrn: "240003",
                    nik: "3333333333333333",
                    name: "Test Patient 3",
                    gender: "MALE",
                    birth_date: new Date("1985-03-20"),
                })
                .returning();
            patientId = patient.id;
            await TestUtil.sleep(50);
        });

        afterEach(async () => {
            await db.delete(patientTable).where(eq(patientTable.id, patientId));
            await TestUtil.sleep(50);
        });

        it("should get patient by id", async () => {
            const response = await app.request(`/api/patients/${patientId}`, {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.id).toBe(patientId);
            expect(body.name).toBe("Test Patient 3");
        });

        it("should return 404 for non-existent patient", async () => {
            const response = await app.request("/api/patients/00000000-0000-0000-0000-000000000000", {
                method: "GET",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
            expect(body.message).toBe("Patient not found");
        });
    });

    describe("PATCH /api/patients/:id - Update Patient", () => {
        beforeEach(async () => {
            const [patient] = await db
                .insert(patientTable)
                .values({
                    mrn: "240004",
                    nik: "4444444444444444",
                    name: "Old Name",
                    gender: "FEMALE",
                    birth_date: new Date("1988-08-08"),
                })
                .returning();
            patientId = patient.id;
            await TestUtil.sleep(50);
        });

        afterEach(async () => {
            await db.delete(patientTable).where(eq(patientTable.id, patientId));
            await TestUtil.sleep(50);
        });

        it("should update patient with admin permission", async () => {
            const response = await app.request(`/api/patients/${patientId}`, {
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
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.name).toBe("Updated Name");
            expect(body.phone).toBe("081999999999");
        });

        it("should update patient with officer permission", async () => {
            const response = await app.request(`/api/patients/${patientId}`, {
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
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.email).toBe("updated@example.com");
        });

        it("should not update patient without update:patient permission", async () => {
            const response = await app.request(`/api/patients/${patientId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: doctorCookie,
                },
                body: JSON.stringify({
                    name: "Hacker Name",
                }),
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.FORBIDDEN);
            expect(body.message).toContain("Permission denied");
        });

        it("should return 404 when updating non-existent patient", async () => {
            const response = await app.request("/api/patients/00000000-0000-0000-0000-000000000000", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: adminCookie,
                },
                body: JSON.stringify({
                    name: "New Name",
                }),
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
            expect(body.message).toBe("Patient not found");
        });
    });

    describe("DELETE /api/patients/:id - Delete Patient", () => {
        beforeEach(async () => {
            // Delete any existing patient with this NIK first
            await db.delete(patientTable).where(eq(patientTable.nik, "5555555555555555"));

            const [patient] = await db
                .insert(patientTable)
                .values({
                    mrn: "240005",
                    nik: "5555555555555555",
                    name: "To Be Deleted",
                    gender: "MALE",
                    birth_date: new Date("1980-12-25"),
                })
                .returning();
            patientId = patient.id;
            await TestUtil.sleep(50);
        });

        afterEach(async () => {
            // Cleanup any remaining patient with this NIK
            try {
                await db.delete(patientTable).where(eq(patientTable.nik, "5555555555555555"));
            } catch {
                // Ignore if already deleted
            }
        });

        it("should delete patient with admin permission", async () => {
            const response = await app.request(`/api/patients/${patientId}`, {
                method: "DELETE",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.message).toBe("Patient deleted successfully");

            // Verify deletion
            const [deletedPatient] = await db
                .select()
                .from(patientTable)
                .where(eq(patientTable.id, patientId))
                .limit(1);
            expect(deletedPatient).toBeUndefined();
        });

        it("should delete patient with officer permission", async () => {
            const response = await app.request(`/api/patients/${patientId}`, {
                method: "DELETE",
                headers: {
                    Cookie: officerCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.OK);
            expect(body.message).toBe("Patient deleted successfully");
        });

        it("should not delete patient without delete:patient permission", async () => {
            const response = await app.request(`/api/patients/${patientId}`, {
                method: "DELETE",
                headers: {
                    Cookie: doctorCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.FORBIDDEN);
            expect(body.message).toContain("Permission denied");
        });

        it("should return 404 when deleting non-existent patient", async () => {
            const response = await app.request("/api/patients/00000000-0000-0000-0000-000000000000", {
                method: "DELETE",
                headers: {
                    Cookie: adminCookie,
                },
            });

            const body = await response.json();
            loggerPino.debug(body);

            expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
            expect(body.message).toBe("Patient not found");
        });
    });
});
