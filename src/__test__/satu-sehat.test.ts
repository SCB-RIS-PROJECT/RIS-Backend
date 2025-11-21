import { describe, expect, it } from "bun:test";
import * as HttpStatusCodes from "stoker/http-status-codes";
import configureOpenAPI from "@/config/configure-open-api";
import createApp from "@/config/create-app";
import { loggerPino } from "@/config/log";
import satuSehatController from "@/controller/satu-sehat.controller";

const app = createApp();
configureOpenAPI(app);
app.route("/", satuSehatController);

describe("Satu Sehat Integration", () => {
    describe("GET /api/satu-sehat/ihs-patient/:nik - Get IHS Patient", () => {
        it("should get IHS patient data by valid NIK", async () => {
            // Using a known NIK from staging environment
            const nik = "9104025209000006";

            const response = await app.request(`/api/satu-sehat/ihs-patient/${nik}`, {
                method: "GET",
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
        it("should get IHS practitioner data by valid NIK", async () => {
            // Using a known NIK from staging environment
            const nik = "3322071302900002";

            const response = await app.request(`/api/satu-sehat/ihs-practitioner/${nik}`, {
                method: "GET",
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
            });

            expect(response1.status).toBe(HttpStatusCodes.OK);

            // Second request - should use cached token
            const response2 = await app.request(`/api/satu-sehat/ihs-patient/${nik}`, {
                method: "GET",
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
