import { and, desc, eq, gte, lt } from "drizzle-orm";
import db from "@/database/db";
import type { ORDER_PRIORITY, ORDER_STATUS } from "@/database/schemas/constants";
import { modalityTable } from "@/database/schemas/schema-modality";
import { orderTable } from "@/database/schemas/schema-order";

type OrderPriority = (typeof ORDER_PRIORITY)[number];
type OrderStatus = (typeof ORDER_STATUS)[number];

/**
 * Generate accession number
 * Format: {MODALITY_CODE}-{YYYYMMDD}-{SEQUENCE}
 * Example: XR-20251201-001
 * Increment if same date, reset if different date
 */
export async function generateAccessionNumber(modalityCode: string): Promise<string> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Format date as YYYYMMDD
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    // Find last accession number for this modality and date
    const lastOrder = await db
        .select()
        .from(orderTable)
        .innerJoin(modalityTable, eq(orderTable.id_modality, modalityTable.id))
        .where(
            and(
                eq(modalityTable.code, modalityCode),
                gte(orderTable.created_at, today),
                lt(orderTable.created_at, tomorrow)
            )
        )
        .orderBy(desc(orderTable.accession_number))
        .limit(1);

    let sequence = 1;

    if (lastOrder.length > 0) {
        const lastAccessionNumber = lastOrder[0].tb_order.accession_number;
        // Extract sequence from last accession number
        // Format: XR-20251201-001
        const parts = lastAccessionNumber.split("-");
        if (parts.length === 3) {
            const lastSequence = Number.parseInt(parts[2], 10);
            if (!Number.isNaN(lastSequence)) {
                sequence = lastSequence + 1;
            }
        }
    }

    // Pad sequence to 3 digits
    const sequenceStr = sequence.toString().padStart(3, "0");

    return `${modalityCode}-${dateStr}-${sequenceStr}`;
}

/**
 * Generate order number
 * Format: ORD-{YYYYMMDD}-{SEQUENCE}
 * Example: ORD-20251201-0001
 */
export async function generateOrderNumber(): Promise<string> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Format date as YYYYMMDD
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    // Find last order number for today
    const lastOrder = await db
        .select()
        .from(orderTable)
        .where(and(gte(orderTable.created_at, today), lt(orderTable.created_at, tomorrow)))
        .orderBy(desc(orderTable.order_number))
        .limit(1);

    let sequence = 1;

    if (lastOrder.length > 0) {
        const lastOrderNumber = lastOrder[0].order_number;
        // Extract sequence from last order number
        // Format: ORD-20251201-0001
        const parts = lastOrderNumber.split("-");
        if (parts.length === 3) {
            const lastSequence = Number.parseInt(parts[2], 10);
            if (!Number.isNaN(lastSequence)) {
                sequence = lastSequence + 1;
            }
        }
    }

    // Pad sequence to 4 digits
    const sequenceStr = sequence.toString().padStart(4, "0");

    return `ORD-${dateStr}-${sequenceStr}`;
}

/**
 * Get modality ID by code
 */
export async function getModalityIdByCode(code: string): Promise<string | undefined> {
    const [modality] = await db.select().from(modalityTable).where(eq(modalityTable.code, code)).limit(1);
    return modality?.id;
}

/**
 * Create a single order
 */
export async function createOrder(data: {
    idPatient: string;
    idPractitioner: string;
    idCreatedBy: string;
    idLoinc: string;
    idModality: string;
    modalityCode: string;
    priority?: OrderPriority;
    status?: OrderStatus;
    diagnosis?: string;
    notes?: string;
    scheduledDate?: Date;
    requireFasting?: boolean;
    requirePregnancyCheck?: boolean;
    requireUseContrast?: boolean;
}) {
    const accessionNumber = await generateAccessionNumber(data.modalityCode);
    const orderNumber = await generateOrderNumber();

    const [order] = await db
        .insert(orderTable)
        .values({
            id_patient: data.idPatient,
            id_practitioner: data.idPractitioner,
            id_created_by: data.idCreatedBy,
            id_loinc: data.idLoinc,
            id_modality: data.idModality,
            accession_number: accessionNumber,
            order_number: orderNumber,
            priority: data.priority || "ROUTINE",
            status_order: data.status || "PENDING",
            diagnosis: data.diagnosis,
            notes: data.notes,
            schedule_date: data.scheduledDate || new Date(),
            require_fasting: data.requireFasting || false,
            require_pregnancy_check: data.requirePregnancyCheck || false,
            require_use_contrast: data.requireUseContrast || false,
        })
        .returning();

    return order;
}

/**
 * Create multiple orders
 */
export async function createManyOrders(
    ordersData: Array<{
        idPatient: string;
        idPractitioner: string;
        idCreatedBy: string;
        idLoinc: string;
        idModality: string;
        modalityCode: string;
        priority?: OrderPriority;
        status?: OrderStatus;
        diagnosis?: string;
        notes?: string;
        scheduledDate?: Date;
        requireFasting?: boolean;
        requirePregnancyCheck?: boolean;
        requireUseContrast?: boolean;
    }>
) {
    const orders = [];

    for (const data of ordersData) {
        const order = await createOrder(data);
        orders.push(order);
    }

    return orders;
}
