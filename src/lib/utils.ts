import db from "@/database/db";
import { detailOrderTable } from "@/database/schemas/schema-order";
import { ilike, desc } from "drizzle-orm";

/**
 * Generate Accession Number (ACSN)
 * Format: {MODALITY_CODE}{YYYYMMDD}{SEQ}
 * Example: DX20231224001, CT20231224002, US20231224001
 *
 * @param modalityCode - The modality code (e.g., "DX", "CT", "US", "MR")
 * @returns Generated accession number
 */
export async function generateAccessionNumber(modalityCode: string): Promise<string> {
    const now = new Date();
    const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `${modalityCode.toUpperCase()}${datePrefix}`;

    // Get max sequence for today with this modality
    const result = await db
        .select({ accessionNumber: detailOrderTable.accession_number })
        .from(detailOrderTable)
        .where(ilike(detailOrderTable.accession_number, `${prefix}%`))
        .orderBy(desc(detailOrderTable.accession_number))
        .limit(1);

    let sequence = 1;
    if (result.length > 0 && result[0].accessionNumber) {
        // Extract sequence from last accession number
        const lastSeq = result[0].accessionNumber.slice(-3);
        sequence = Number.parseInt(lastSeq, 10) + 1;
    }

    return `${prefix}${sequence.toString().padStart(3, "0")}`;
}

/**
 * Generate Order Number
 * Format: ORD-{YYYYMMDD}-{SEQ}
 * Example: ORD-20231224-0001
 *
 * @returns Generated order number
 */
export async function generateOrderNumber(): Promise<string> {
    const now = new Date();
    const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `ORD-${datePrefix}-`;

    // Get max sequence for today
    const result = await db
        .select({ orderNumber: detailOrderTable.order_number })
        .from(detailOrderTable)
        .where(ilike(detailOrderTable.order_number, `${prefix}%`))
        .orderBy(desc(detailOrderTable.order_number))
        .limit(1);

    let sequence = 1;
    if (result.length > 0 && result[0].orderNumber) {
        const lastSeq = result[0].orderNumber.slice(-4);
        sequence = Number.parseInt(lastSeq, 10) + 1;
    }

    return `${prefix}${sequence.toString().padStart(4, "0")}`;
}

/**
 * Format date to Satu Sehat datetime format
 * @param date - Date to format
 * @returns Formatted datetime string
 */
export function toSatuSehatDateTime(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

/**
 * Extract ID from FHIR reference
 * @param reference - FHIR reference string (e.g., "Patient/123")
 * @returns Extracted ID
 */
export function extractIdFromReference(reference: string): string {
    return reference.split("/").pop() || "";
}

/**
 * Build FHIR reference
 * @param resourceType - Resource type (e.g., "Patient", "Encounter")
 * @param id - Resource ID
 * @returns FHIR reference string
 */
export function buildFhirReference(resourceType: string, id: string): string {
    return `${resourceType}/${id}`;
}

/**
 * Format date to YYYYMMDD
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDateYYYYMMDD(date: Date): string {
    return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * Parse ISO date string to Date object
 * @param dateStr - ISO date string or Date object
 * @returns Date object
 */
export function parseDate(dateStr: string | Date): Date {
    return typeof dateStr === "string" ? new Date(dateStr) : dateStr;
}

/**
 * Standard API Response Interface
 */
export interface ApiResponse<T = any> {
    data: T;
    message: string;
    code: number;
    meta?: {
        total: number;
        page: number;
        per_page: number;
        total_pages: number;
        has_next_page: boolean;
        has_prev_page: boolean;
    };
}

/**
 * Create standardized API response
 * @param data - Response data
 * @param message - Response message
 * @param code - HTTP status code
 * @param meta - Optional pagination metadata
 * @returns Standardized API response object
 */
export function createResponse<T = any>(
    data: T,
    message: string,
    code: number,
    meta?: ApiResponse<T>["meta"]
): ApiResponse<T> {
    const response: ApiResponse<T> = {
        data,
        message,
        code,
    };

    if (meta) {
        response.meta = meta;
    }

    return response;
}

/**
 * Helper to create OpenAPI response schema with standard wrapper
 * Wraps any data schema with { data, message, code, meta? } structure
 */
import { z } from "@hono/zod-openapi";

export function createApiResponseSchema<T extends z.ZodTypeAny>(
    dataSchema: T,
    withMeta = false
) {
    const baseSchema = z.object({
        data: dataSchema,
        message: z.string(),
        code: z.number(),
    });

    if (withMeta) {
        return baseSchema.extend({
            meta: z.object({
                total: z.number(),
                page: z.number(),
                per_page: z.number(),
                total_pages: z.number(),
                has_next_page: z.boolean(),
                has_prev_page: z.boolean(),
            }).optional(),
        });
    }

    return baseSchema;
}
