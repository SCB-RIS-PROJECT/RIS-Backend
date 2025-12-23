import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";
import createRouter from "@/config/create-router";
import { loggerPino } from "@/config/log";
import {
    createOrderSchema,
    detailOrderIdParamSchema,
    fullOrderResponseSchema,
    orderIdParamSchema,
    orderPaginationResponseSchema,
    orderQuerySchema,
    updateDetailOrderSchema,
    updateOrderSchema,
    detailOrderResponseSchema,
    orderCreationSuccessSchema,
} from "@/interface/order.interface";
import { authMiddleware } from "@/middleware/auth.middleware";
import { permissionMiddleware } from "@/middleware/role-permission.middleware";
import { OrderService } from "@/service/order.service";

const orderController = createRouter();

const tags = ["Order"];

// ==================== GET ALL ORDERS ====================
orderController.openapi(
    createRoute({
        tags,
        method: "get",
        path: "/api/orders",
        summary: "Get all orders",
        description:
            "Get paginated list of orders with optional filters (patient, practitioner, status, priority, date range)",
        middleware: [authMiddleware, permissionMiddleware("read:order")] as const,
        request: {
            query: orderQuerySchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(orderPaginationResponseSchema, "Orders retrieved successfully"),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(createErrorSchema(orderQuerySchema), "Invalid query parameters"),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                createMessageObjectSchema("Failed to fetch orders"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const query = c.req.valid("query");
            const data = await OrderService.getAllOrders(query);
            return c.json(data, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to fetch orders" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

// ==================== GET ORDER BY ID ====================
orderController.openapi(
    createRoute({
        tags,
        method: "get",
        path: "/api/orders/{id}",
        summary: "Get order by ID",
        description: "Get a single order with all details by its ID",
        middleware: [authMiddleware, permissionMiddleware("read:order")] as const,
        request: {
            params: orderIdParamSchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(fullOrderResponseSchema, "Order retrieved successfully"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema("Order not found"), "Order not found"),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                createMessageObjectSchema("Failed to fetch order"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const { id } = c.req.valid("param");
            const order = await OrderService.getOrderById(id);

            if (!order) {
                return c.json({ message: "Order not found" }, HttpStatusCodes.NOT_FOUND);
            }

            return c.json(order, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to fetch order" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

// ==================== CREATE ORDER ====================
orderController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/orders",
        summary: "Create new order",
        description:
            "Create a new order with multiple order details. This endpoint is for SIMRS integration to submit radiology orders.",
        middleware: [authMiddleware, permissionMiddleware("create:order")] as const,
        request: {
            body: jsonContentRequired(createOrderSchema, "Order data with details"),
        },
        responses: {
            [HttpStatusCodes.CREATED]: jsonContent(fullOrderResponseSchema, "Order created successfully"),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(createErrorSchema(createOrderSchema), "Invalid request body"),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                createMessageObjectSchema("Failed to create order"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const data = c.req.valid("json");
            const user = c.get("user");

            if (!user) {
                return c.json({ message: "User not found in context" }, HttpStatusCodes.UNAUTHORIZED);
            }

            const order = await OrderService.createOrder(data, user.id);
            return c.json(order, HttpStatusCodes.CREATED);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to create order" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

// ==================== UPDATE ORDER ====================
orderController.openapi(
    createRoute({
        tags,
        method: "patch",
        path: "/api/orders/{id}",
        summary: "Update order",
        description: "Update order main data (practitioner, encounter)",
        middleware: [authMiddleware, permissionMiddleware("update:order")] as const,
        request: {
            params: orderIdParamSchema,
            body: jsonContentRequired(updateOrderSchema, "Order update data"),
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(fullOrderResponseSchema, "Order updated successfully"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema("Order not found"), "Order not found"),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(createErrorSchema(updateOrderSchema), "Invalid request body"),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                createMessageObjectSchema("Failed to update order"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const { id } = c.req.valid("param");
            const data = c.req.valid("json");

            const order = await OrderService.updateOrder(id, data);

            if (!order) {
                return c.json({ message: "Order not found" }, HttpStatusCodes.NOT_FOUND);
            }

            return c.json(order, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to update order" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

// ==================== UPDATE ORDER DETAIL ====================
orderController.openapi(
    createRoute({
        tags,
        method: "patch",
        path: "/api/orders/{id}/details/{detailId}",
        summary: "Update order detail",
        description: "Update order detail (status, schedule, diagnosis, notes, Satu Sehat IDs)",
        middleware: [authMiddleware, permissionMiddleware("update:order")] as const,
        request: {
            params: detailOrderIdParamSchema,
            body: jsonContentRequired(updateDetailOrderSchema, "Order detail update data"),
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(detailOrderResponseSchema, "Order detail updated successfully"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("Order detail not found"),
                "Order detail not found"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(
                createErrorSchema(updateDetailOrderSchema),
                "Invalid request body"
            ),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                createMessageObjectSchema("Failed to update order detail"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const { detailId } = c.req.valid("param");
            const data = c.req.valid("json");

            const detail = await OrderService.updateDetailOrder(detailId, data);

            if (!detail) {
                return c.json({ message: "Order detail not found" }, HttpStatusCodes.NOT_FOUND);
            }

            return c.json(detail, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to update order detail" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

// ==================== DELETE ORDER ====================
orderController.openapi(
    createRoute({
        tags,
        method: "delete",
        path: "/api/orders/{id}",
        summary: "Delete order",
        description: "Delete an order and all its details",
        middleware: [authMiddleware, permissionMiddleware("delete:order")] as const,
        request: {
            params: orderIdParamSchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(createMessageObjectSchema("Order deleted successfully"), "Deleted"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema("Order not found"), "Order not found"),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                createMessageObjectSchema("Failed to delete order"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const { id } = c.req.valid("param");
            const deleted = await OrderService.deleteOrder(id);

            if (!deleted) {
                return c.json({ message: "Order not found" }, HttpStatusCodes.NOT_FOUND);
            }

            return c.json({ message: "Order deleted successfully" }, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to delete order" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

// ==================== DELETE ORDER DETAIL ====================
orderController.openapi(
    createRoute({
        tags,
        method: "delete",
        path: "/api/orders/{id}/details/{detailId}",
        summary: "Delete order detail",
        description: "Delete a specific order detail",
        middleware: [authMiddleware, permissionMiddleware("delete:order")] as const,
        request: {
            params: detailOrderIdParamSchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                createMessageObjectSchema("Order detail deleted successfully"),
                "Deleted"
            ),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("Order detail not found"),
                "Order detail not found"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                createMessageObjectSchema("Failed to delete order detail"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const { detailId } = c.req.valid("param");
            const deleted = await OrderService.deleteDetailOrder(detailId);

            if (!deleted) {
                return c.json({ message: "Order detail not found" }, HttpStatusCodes.NOT_FOUND);
            }

            return c.json({ message: "Order detail deleted successfully" }, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to delete order detail" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

// ==================== GET ORDER DETAIL BY ID ====================
orderController.openapi(
    createRoute({
        tags,
        method: "get",
        path: "/api/orders/{id}/details/{detailId}",
        summary: "Get order detail by ID",
        description: "Get a specific order detail by its ID",
        middleware: [authMiddleware, permissionMiddleware("read:order")] as const,
        request: {
            params: detailOrderIdParamSchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(detailOrderResponseSchema, "Order detail retrieved successfully"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("Order detail not found"),
                "Order detail not found"
            ),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                createMessageObjectSchema("Failed to fetch order detail"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const { detailId } = c.req.valid("param");
            const detail = await OrderService.getDetailOrderById(detailId);

            if (!detail) {
                return c.json({ message: "Order detail not found" }, HttpStatusCodes.NOT_FOUND);
            }

            return c.json(detail, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to fetch order detail" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

// ==================== CREATE ORDER FROM SIMRS ====================
orderController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/orders/simrs",
        summary: "Create order from SIMRS",
        description:
            "Create a new order from SIMRS. This endpoint accepts FHIR ServiceRequest data and returns only the order ID for SIMRS reference.",
        middleware: [authMiddleware, permissionMiddleware("create:order")] as const,
        request: {
            body: jsonContentRequired(createOrderSchema, "SIMRS order data with FHIR fields"),
        },
        responses: {
            [HttpStatusCodes.CREATED]: jsonContent(orderCreationSuccessSchema, "Order created successfully, returns order ID"),
            [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
                createMessageObjectSchema("Not authenticated"),
                "User not authenticated"
            ),
            [HttpStatusCodes.FORBIDDEN]: jsonContent(
                createMessageObjectSchema("Permission denied"),
                "Insufficient permissions"
            ),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(createErrorSchema(createOrderSchema), "Invalid request body"),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                createMessageObjectSchema("Failed to create order"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const data = c.req.valid("json");
            const user = c.get("user");

            if (!user) {
                return c.json({ message: "User not found in context" }, HttpStatusCodes.UNAUTHORIZED);
            }

            const order = await OrderService.createOrder(data, user.id);
            
            // Return simplified response for SIMRS
            return c.json(
                {
                    success: true,
                    message: "Order created successfully",
                    data: {
                        id_order: order.id,
                        order_number: order.details[0]?.order_number || "",
                        created_at: order.created_at,
                    },
                },
                HttpStatusCodes.CREATED
            );
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to create order" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

export default orderController;
