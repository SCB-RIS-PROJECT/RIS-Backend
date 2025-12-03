import { z } from "@hono/zod-openapi";
import { ORDER_STATUS } from "@/database/schemas/constants";
import { toZodV4SchemaTyped } from "@/lib/zod-util";

// Create order initial request (minimal info - just patient and practitioner)
export const createOrderInitialSchema = toZodV4SchemaTyped(
    z.object({
        id_patient: z.string().uuid("Invalid patient ID"),
        id_practitioner: z.string().uuid("Invalid practitioner ID"),
    })
);

// Update order status schema
export const updateOrderStatusSchema = toZodV4SchemaTyped(
    z.object({
        status_order: z.enum(ORDER_STATUS),
    })
);

// Order response schema for API
export const orderResponseSchema = z.object({
    id: z.string().uuid(),
    order_number: z.string(),
    status_order: z.enum(ORDER_STATUS),
});

// Order with encounter response
export const orderWithEncounterResponseSchema = z.object({
    order: orderResponseSchema,
    encounter: z
        .object({
            id: z.string(),
            status: z.string(),
        })
        .nullable(),
});

// Param schemas
export const orderIdParamSchema = z.object({
    id: z.string().uuid("Invalid order ID"),
});

// TypeScript types
export type CreateOrderInitialInput = z.infer<typeof createOrderInitialSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderResponse = z.infer<typeof orderResponseSchema>;
export type OrderWithEncounterResponse = z.infer<typeof orderWithEncounterResponseSchema>;
export type OrderIdParam = z.infer<typeof orderIdParamSchema>;
