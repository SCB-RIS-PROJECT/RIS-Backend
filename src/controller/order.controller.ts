import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";
import createRouter from "@/config/create-router";
import {
    createOrderInitialSchema,
    orderIdParamSchema,
    orderResponseSchema,
    orderWithEncounterResponseSchema,
    updateOrderStatusSchema,
} from "@/interface/order.interface";
import { authMiddleware } from "@/middleware/auth.middleware";
import { permissionMiddleware } from "@/middleware/role-permission.middleware";
import { OrderService } from "@/service/order.service";

const orderController = createRouter();

const tags = ["Order"];

// Create order with encounter
orderController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/orders",
        summary: "Create Order with Optional Encounter",
        description:
            "Create a new order by selecting patient and practitioner. If both have IHS number, an encounter will be created in Satu Sehat automatically.",
        middleware: [authMiddleware, permissionMiddleware("create:order")] as const,
        request: {
            body: jsonContentRequired(createOrderInitialSchema, "Order initial data (patient and practitioner)"),
        },
        responses: {
            [HttpStatusCodes.CREATED]: jsonContent(
                orderWithEncounterResponseSchema,
                "Order and encounter created successfully"
            ),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(
                createMessageObjectSchema("Patient or Practitioner not found"),
                "Invalid request"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
                createErrorSchema(createOrderInitialSchema),
                "Validation error(s)"
            ),
        },
    }),
    async (c) => {
        const data = c.req.valid("json");
        const user = c.get("user");

        if (!user) {
            return c.json(
                {
                    message: "User not authenticated",
                },
                HttpStatusCodes.UNAUTHORIZED
            );
        }

        try {
            const result = await OrderService.createOrderWithEncounter(data, user.id);
            return c.json(result, HttpStatusCodes.CREATED);
        } catch (error) {
            if (error instanceof Error) {
                return c.json(
                    {
                        message: error.message,
                    },
                    HttpStatusCodes.BAD_REQUEST
                );
            }
            throw error;
        }
    }
);

// Update order status
orderController.openapi(
    createRoute({
        tags,
        method: "patch",
        path: "/api/orders/{id}/status",
        summary: "Update Order Status",
        description: "Update the status of an order.",
        middleware: [authMiddleware, permissionMiddleware("update:order")] as const,
        request: {
            params: orderIdParamSchema,
            body: jsonContentRequired(updateOrderStatusSchema, "Order status update data"),
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(orderResponseSchema, "Order status updated successfully"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("Order not found"),
                "Order does not exist"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
                createErrorSchema(updateOrderStatusSchema),
                "Validation error(s)"
            ),
        },
    }),
    async (c) => {
        const { id } = c.req.valid("param");
        const data = c.req.valid("json");

        const order = await OrderService.updateOrderStatus(id, data);

        if (!order) {
            return c.json(
                {
                    message: "Order not found",
                },
                HttpStatusCodes.NOT_FOUND
            );
        }

        return c.json(order, HttpStatusCodes.OK);
    }
);

// Delete order
orderController.openapi(
    createRoute({
        tags,
        method: "delete",
        path: "/api/orders/{id}",
        summary: "Delete Order",
        description: "Delete an order permanently.",
        middleware: [authMiddleware, permissionMiddleware("delete:order")] as const,
        request: {
            params: orderIdParamSchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(createMessageObjectSchema("Order deleted successfully"), "Order deleted"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("Order not found"),
                "Order does not exist"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
        },
    }),
    async (c) => {
        const { id } = c.req.valid("param");
        const deleted = await OrderService.deleteOrder(id);

        if (!deleted) {
            return c.json(
                {
                    message: "Order not found",
                },
                HttpStatusCodes.NOT_FOUND
            );
        }

        return c.json(
            {
                message: "Order deleted successfully",
            },
            HttpStatusCodes.OK
        );
    }
);

export default orderController;
