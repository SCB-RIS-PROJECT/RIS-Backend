/** biome-ignore-all lint/style/noNonNullAssertion: <mager buat type> */

import { eq, type InferSelectModel } from "drizzle-orm";
import env from "@/config/env";
import db from "@/database/db";
import { generateOrderNumber } from "@/database/factories/factory-order";
import { orderTable } from "@/database/schemas/schema-order";
import { patientTable } from "@/database/schemas/schema-patient";
import { practitionerTable } from "@/database/schemas/schema-practitioner";
import type {
    CreateOrderInitialInput,
    OrderResponse,
    OrderWithEncounterResponse,
    UpdateOrderStatusInput,
} from "@/interface/order.interface";
import { toFHIRPostEncounter } from "@/lib/satu-sehat";
import { SatuSehatService } from "@/service/satu-sehat.service";

export class OrderService {
    static formatOrderResponse(order: InferSelectModel<typeof orderTable>): OrderResponse {
        return {
            id: order.id,
            order_number: order.order_number as string,
            status_order: order.status_order!,
        };
    }

    /**
     * Create order with Satu Sehat encounter integration
     * Flow:
     * 1. Get patient and practitioner data
     * 2. Create encounter in Satu Sehat
     * 3. Create order with encounter ID
     */
    static async createOrderWithEncounter(
        data: CreateOrderInitialInput,
        userId: string
    ): Promise<OrderWithEncounterResponse> {
        // 1. Get patient data
        const [patient] = await db.select().from(patientTable).where(eq(patientTable.id, data.id_patient)).limit(1);

        if (!patient) {
            throw new Error("Patient not found");
        }

        // 2. Get practitioner data
        const [practitioner] = await db
            .select()
            .from(practitionerTable)
            .where(eq(practitionerTable.id, data.id_practitioner))
            .limit(1);

        if (!practitioner) {
            throw new Error("Practitioner not found");
        }

        // 3. Create encounter in Satu Sehat (only if both have IHS number)
        const startTime = new Date();
        let encounterResponse = null;

        if (patient.ihs_number && practitioner.ihs_number) {
            const encounterPayload = toFHIRPostEncounter({
                status: "arrived",
                patientID: patient.ihs_number,
                patientName: patient.name,
                practitionerID: practitioner.ihs_number,
                practitionerName: practitioner.name,
                startTime,
                organizationID: env.SATU_SEHAT_ORGANIZATION_ID,
                organizationIHSNumber: env.SATU_SEHAT_ORGANIZATION_IHS_NUMBER,
                locationID: env.SATU_SEHAT_LOCATION_ID,
                locationName: env.SATU_SEHAT_LOCATION_NAME,
                classCode: "AMB",
                classDisplay: "ambulatory",
            });

            encounterResponse = await SatuSehatService.postEncounter(encounterPayload);
        }

        // 4. Generate order number
        const orderNumber = await generateOrderNumber();

        // 5. Create order in database
        const [order] = await db
            .insert(orderTable)
            .values({
                id_patient: data.id_patient,
                id_practitioner: data.id_practitioner,
                id_created_by: userId,
                id_encounter_ss: encounterResponse?.id || null,
                order_number: orderNumber,
                order_date: startTime,
                schedule_date: startTime,
                priority: "ROUTINE",
                status_order: "PENDING",
                require_fasting: false,
                require_pregnancy_check: false,
                require_use_contrast: false,
            })
            .returning();

        return {
            order: OrderService.formatOrderResponse(order),
            encounter: encounterResponse
                ? {
                      id: encounterResponse.id,
                      status: encounterResponse.status,
                  }
                : null,
        };
    }

    /**
     * Update order status by ID
     */
    static async updateOrderStatus(orderId: string, data: UpdateOrderStatusInput): Promise<OrderResponse | null> {
        const [order] = await db
            .update(orderTable)
            .set({
                status_order: data.status_order,
                updated_at: new Date(),
            })
            .where(eq(orderTable.id, orderId))
            .returning();

        if (!order) return null;

        return OrderService.formatOrderResponse(order);
    }

    /**
     * Delete order by ID
     */
    static async deleteOrder(orderId: string): Promise<boolean> {
        const result = await db.delete(orderTable).where(eq(orderTable.id, orderId)).returning();

        return result.length > 0;
    }
}
