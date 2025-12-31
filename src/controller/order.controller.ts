import { createRoute, z } from "@hono/zod-openapi";
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
    mwlPushResponseSchema,
    finalizeOrderDetailSchema,
    finalizeOrderDetailResponseSchema,
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
        summary: "Get all orders with filters and search",
        description: `
Get paginated list of orders with comprehensive filtering and search capabilities.

**Search Parameter:**
- \`search\`: Search by patient name or MRN (case-insensitive, partial match)

**Filter Parameters:**
- \`order_status\`: Filter by order status (IN_REQUEST, IN_QUEUE, IN_PROGRESS, FINAL)
- \`order_priority\`: Filter by priority (ROUTINE, URGENT, STAT)
- \`order_from\`: Filter by source (INTERNAL, EXTERNAL)
- \`id_patient\`: Filter by specific patient ID
- \`id_practitioner\`: Filter by specific practitioner ID
- \`date_from\`: Filter orders from this date (ISO 8601 format)
- \`date_to\`: Filter orders until this date (ISO 8601 format)

**Pagination:**
- \`page\`: Page number (default: 1)
- \`per_page\`: Items per page (max: 100, default: 10)
- \`sort\`: Sort by field (created_at, updated_at)
- \`dir\`: Sort direction (asc, desc)

**Examples:**
- Search: \`?search=budi\`
- Filter by status: \`?order_status=IN_QUEUE\`
- Combined: \`?search=john&order_status=IN_PROGRESS&date_from=2025-12-01T00:00:00Z\`

**Note:** 
- Status filters will only show orders that have at least one detail matching the criteria
- Orders without details will not appear when using status/priority/from filters
        `,
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

// ==================== GET ORDER BY ACCESSION NUMBER ====================
orderController.openapi(
    createRoute({
        tags,
        method: "get",
        path: "/api/orders/by-accession/:accessionNumber",
        summary: "Get order by Accession Number",
        description: "Get a single order with all details by its Accession Number (ACSN)",
        middleware: [authMiddleware, permissionMiddleware("read:order")] as const,
        request: {
            params: z.object({
                accessionNumber: z.string().min(1).openapi({
                    param: {
                        name: "accessionNumber",
                        in: "path",
                    },
                    example: "20251230001",
                }),
            }),
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
            const { accessionNumber } = c.req.valid("param");
            const order = await OrderService.getOrderByAccessionNumber(accessionNumber);

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
        summary: "Update order main data",
        description: `Update informasi utama order (header level).

**Field yang bisa diupdate:**
- \`id_practitioner\`: UUID practitioner (dokter pengirim) - jika ingin mengganti dokter pengirim
- \`id_encounter_ss\`: ID Encounter dari Satu Sehat - jika ada perubahan encounter

**Use Cases:**
- Mengganti dokter pengirim karena kesalahan input
- Update encounter ID setelah ada perubahan di SIMRS
- Koreksi data administratif order

**Note:** Untuk update data pemeriksaan (status, jadwal, hasil, dll), gunakan PATCH /api/orders/{id}/details/{detailId}
        `,
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
        summary: "Update order detail (pemeriksaan radiologi)",
        description: `Update detail pemeriksaan radiologi. Endpoint ini digunakan di berbagai tahap workflow:

**1. TAHAP PENJADWALAN (Scheduling)**
\`\`\`json
{
  "schedule_date": "2025-12-30T10:00:00Z",
  "order_status": "IN_QUEUE"
}
\`\`\`

**2. TAHAP PERSIAPAN PEMERIKSAAN (Pre-Examination)**
\`\`\`json
{
  "modality_code": "CT",
  "ae_title": "CTScan0001",
  "performer_id": "10012572188",
  "performer_name": "dr. John Radiologist",
  "order_status": "IN_PROGRESS"
}
\`\`\`

**3. TAHAP HASIL & KESIMPULAN (Post-Examination)**
\`\`\`json
{
  "observation_notes": "Left upper and middle lung zones show reticulonodular opacities.\\nThe left apical lung zone shows a cavitary lesion (active TB).\\nLeft apical pleural thickening\\nMild mediastinum widening is noted\\nNormal heart size.\\nFree costophrenic angles.",
  "diagnostic_conclusion": "Suspicious of active pulmonary tuberculosis in the left upper lobe. Recommend clinical correlation and sputum examination.",
  "diagnosis": {
    "code": "A15.0",
    "display": "Tuberculosis of lung"
  },
  "order_status": "FINAL"
}
\`\`\`

**4. UPDATE CONTRAST & KPTL (Optional)**
\`\`\`json
{
  "contrast_code": "92003638",
  "contrast_name": "Iohexol injeksi 350 mg/ml (IV)",
  "kptl_code": "3.13.9.1.01.01.001",
  "kptl_display": "CT Scan Kepala dengan Kontras"
}
\`\`\`

**Field yang bisa diupdate:**
- \`schedule_date\`: Jadwal pemeriksaan (ISO 8601)
- \`order_priority\`: Prioritas (ROUTINE, URGENT, ASAP, STAT)
- \`order_status\`: Status (IN_REQUEST, IN_QUEUE, IN_PROGRESS, FINAL)
- \`diagnosis\`: Diagnosis ICD-10 (code & display)
- \`notes\`: Catatan umum
- \`observation_notes\`: **Hasil pemeriksaan radiologi** (untuk Observation ke Satu Sehat)
- \`diagnostic_conclusion\`: **Kesimpulan diagnosis** (untuk DiagnosticReport ke Satu Sehat)
- \`modality_code\`: Kode modalitas DICOM (CT, MR, DX, CR, US, dll)
- \`ae_title\`: AE Title workstation DICOM
- \`performer_id\`: ID Practitioner radiolog (dari Satu Sehat)
- \`performer_name\`: Nama radiolog
- \`contrast_code\`: Kode KFA kontras
- \`contrast_name\`: Nama kontras
- \`kptl_code\`: Kode KPTL
- \`kptl_display\`: Deskripsi KPTL

**Workflow Integration:**
1. **Setelah order dibuat** → Update modality & AE Title
2. **Setelah jadwal ditentukan** → Update schedule_date & status
3. **Sebelum pemeriksaan** → Update performer (radiolog)
4. **Setelah pemeriksaan selesai** → Update observation_notes & diagnostic_conclusion
5. **Setelah verifikasi** → Update status menjadi FINAL
6. **Setelah semuanya lengkap** → Kirim ke Satu Sehat (ServiceRequest → Observation → DiagnosticReport)
        `,
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
        description: `Create a new radiology order from SIMRS with simplified format.

**Flow:**
1. SIMRS sends order data
2. RIS generates ACSN and stores order
3. Returns simple success message
4. Satu Sehat will be sent later after RIS completes/updates the order

**Required data from SIMRS:**
- pemeriksaan: LOINC code information
- subject: Patient information (ihs_id, name, mrn, birth_date, age, gender)
- encounter: Encounter ID from Satu Sehat
- requester: Referring physician (id_practitioner, name_practitioner)
- diagnosa: ICD-10 diagnosis (optional)`,
        middleware: [authMiddleware, permissionMiddleware("create:order")] as const,
        request: {
            body: jsonContentRequired(createOrderSchema, "SIMRS order data with FHIR ServiceRequest"),
        },
        responses: {
            [HttpStatusCodes.CREATED]: jsonContent(orderCreationSuccessSchema, "Order created successfully"),
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

            // Create order and auto-send to Satu Sehat
            const result = await OrderService.createOrderForSimrs(data, user.id);
            
            return c.json(result, HttpStatusCodes.CREATED);
        } catch (error) {
            loggerPino.error(error);
            return c.json({ message: "Failed to create order" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

// ==================== PUSH ORDER TO MWL ====================
// Note: Send to Satu Sehat is now automatic when creating order from SIMRS
orderController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/orders/{id}/push-to-mwl",
        summary: "Push order to MWL (Modality Worklist)",
        description:
            "Push existing order details to MWL server (Orthanc or DCM4CHEE). Each order detail will be sent as separate worklist item. Use query parameter 'target' to specify destination: 'orthanc', 'dcm4chee', or 'both'.",
        middleware: [authMiddleware, permissionMiddleware("create:order")] as const,
        request: {
            params: orderIdParamSchema,
            query: z.object({
                target: z.enum(["orthanc", "dcm4chee", "both"]).default("dcm4chee").openapi({
                    description: "MWL target server: orthanc, dcm4chee, or both",
                    example: "dcm4chee",
                }),
            }),
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                createMessageObjectSchema("Order pushed to MWL successfully"),
                "Order pushed to MWL"
            ),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("Order not found"),
                "Order does not exist"
            ),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(
                createMessageObjectSchema("Invalid order data"),
                "Order cannot be pushed to MWL"
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
                createMessageObjectSchema("Failed to push order to MWL"),
                "Server error"
            ),
        },
        security: [{ bearerAuth: [] }],
    }),
    async (c) => {
        try {
            const { id } = c.req.valid("param");
            const { target } = c.req.valid("query");

            const result = await OrderService.pushOrderToMWLWithTarget(id, target);

            if (!result.success) {
                const statusCode = result.message.includes("not found")
                    ? HttpStatusCodes.NOT_FOUND
                    : HttpStatusCodes.BAD_REQUEST;

                return c.json(
                    {
                        success: false,
                        message: result.message,
                        results: result.results,
                    },
                    statusCode
                );
            }

            return c.json(
                {
                    success: true,
                    message: result.message,
                    results: result.results,
                },
                HttpStatusCodes.OK
            );
        } catch (error) {
            loggerPino.error(error);
            return c.json(
                {
                    success: false,
                    message: "Failed to push order to MWL",
                },
                HttpStatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }
);

// ==================== SEND TO SATU SEHAT (ServiceRequest Only) ====================
orderController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/orders/{id}/details/{detailId}/send-to-satusehat",
        summary: "Send ServiceRequest to Satu Sehat",
        description: `**Kirim ServiceRequest ke Satu Sehat API**

**Prerequisite:** Data sudah di-update via PATCH /api/orders/{id}/details/{detailId} dengan:
- modality_code
- ae_title  
- performer_id (id_performer_ss)
- performer_name (performer_display)
- contrast_code, contrast_name (optional)

**Flow:**
1. Ambil data order detail dari database
2. Validasi data lengkap (modality, performer, dll)
3. Build ServiceRequest FHIR
4. POST ke Satu Sehat /ServiceRequest
5. Simpan ServiceRequest ID ke database
6. Return response

**Tidak ada request body** - Semua data diambil dari database.`,
        middleware: [authMiddleware, permissionMiddleware("update:order")] as const,
        request: {
            params: detailOrderIdParamSchema,
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                z.object({
                    success: z.boolean(),
                    message: z.string(),
                    data: z.object({
                        detail_id: z.string().uuid(),
                        accession_number: z.string(),
                        service_request_id: z.string(),
                    }),
                }),
                "ServiceRequest sent to Satu Sehat successfully"
            ),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("Order detail not found"),
                "Order detail not found"
            ),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(
                createMessageObjectSchema("Missing required data. Please update order detail first."),
                "Invalid request - missing data"
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
                createMessageObjectSchema("Failed to send to Satu Sehat"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const { id, detailId } = c.req.valid("param");

            const result = await OrderService.sendToSatuSehat(id, detailId);

            if (!result.success) {
                return c.json(
                    {
                        success: false,
                        message: result.message,
                    },
                    HttpStatusCodes.BAD_REQUEST
                );
            }

            if (!result.data) {
                return c.json(
                    {
                        success: false,
                        message: "Unexpected error: No data returned",
                    },
                    HttpStatusCodes.INTERNAL_SERVER_ERROR
                );
            }

            return c.json(
                {
                    success: result.success,
                    message: result.message,
                    data: result.data,
                },
                HttpStatusCodes.OK
            );
        } catch (error) {
            loggerPino.error(error);
            return c.json(
                {
                    success: false,
                    message: error instanceof Error ? error.message : "Failed to send to Satu Sehat",
                },
                HttpStatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }
);

// ==================== PUSH TO MWL (Modality Worklist Only) ====================
orderController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/orders/{id}/details/{detailId}/push-to-mwl",
        summary: "Push order to Modality Worklist (MWL)",
        description: `**Push order ke MWL (Orthanc atau DCM4CHEE)**

**Prerequisite:** Data sudah di-update via PATCH /api/orders/{id}/details/{detailId} dengan:
- modality_code
- ae_title

**Flow:**
1. Ambil data order detail dari database
2. Build MWL worklist item
3. Push ke target MWL (Orthanc/DCM4CHEE/both)
4. Return response

**Request Body (optional):**
- mwl_target: "orthanc" | "dcm4chee" | "both" (default: dcm4chee)`,
        middleware: [authMiddleware, permissionMiddleware("update:order")] as const,
        request: {
            params: detailOrderIdParamSchema,
            body: jsonContentRequired(
                z.object({
                    mwl_target: z.enum(["orthanc", "dcm4chee", "both"]).optional().default("dcm4chee"),
                }),
                "MWL target configuration"
            ),
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                z.object({
                    success: z.boolean(),
                    message: z.string(),
                    data: z.object({
                        detail_id: z.string().uuid(),
                        accession_number: z.string(),
                        mwl_target: z.string(),
                    }),
                }),
                "Order pushed to MWL successfully"
            ),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("Order detail not found"),
                "Order detail not found"
            ),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(
                createMessageObjectSchema("Missing required data (modality_code, ae_title)"),
                "Invalid request - missing data"
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
                createMessageObjectSchema("Failed to push to MWL"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const { id, detailId } = c.req.valid("param");
            const { mwl_target } = c.req.valid("json");

            const result = await OrderService.pushToMWL(id, detailId, mwl_target || "dcm4chee");

            if (!result.success) {
                return c.json(
                    {
                        success: false,
                        message: result.message,
                    },
                    HttpStatusCodes.BAD_REQUEST
                );
            }

            if (!result.data) {
                return c.json(
                    {
                        success: false,
                        message: "Unexpected error: No data returned",
                    },
                    HttpStatusCodes.INTERNAL_SERVER_ERROR
                );
            }

            return c.json(
                {
                    success: result.success,
                    message: result.message,
                    data: result.data,
                },
                HttpStatusCodes.OK
            );
        } catch (error) {
            loggerPino.error(error);
            return c.json(
                {
                    success: false,
                    message: error instanceof Error ? error.message : "Failed to push to MWL",
                },
                HttpStatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }
);

// ==================== FETCH IMAGING STUDY FROM SATU SEHAT ====================
orderController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/orders/fetch-imaging-study/:accessionNumber",
        summary: "Fetch ImagingStudy from Satu Sehat by Accession Number",
        description: `
Fetch ImagingStudy data from Satu Sehat API using the Accession Number and save the ImagingStudy ID to the database.

This endpoint will:
1. Query Satu Sehat API: \`/ImagingStudy?identifier=http://sys-ids.kemkes.go.id/acsn/{Org_id}|{ACSN}\`
2. Extract the ImagingStudy ID from the response
3. Update the detail order record with the ImagingStudy ID

**Returns:**
- Success response with the saved ImagingStudy ID
- Error message if not found or failed

**Use Case:**
- After radiology examination is completed and uploaded to PACS
- To link the order with the actual ImagingStudy in Satu Sehat
        `,
        middleware: [authMiddleware, permissionMiddleware("update:order")],
        request: {
            params: z.object({
                accessionNumber: z.string().min(1).openapi({
                    param: {
                        name: "accessionNumber",
                        in: "path",
                    },
                    example: "20251230001",
                }),
            }),
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                z.object({
                    success: z.boolean(),
                    message: z.string(),
                    data: z.object({
                        detail_id: z.string().uuid(),
                        accession_number: z.string(),
                        imaging_study_id: z.string(),
                    }).optional(),
                }),
                "Successfully fetched ImagingStudy ID from Satu Sehat"
            ),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                z.object({
                    success: z.boolean(),
                    message: z.string(),
                }),
                "Accession number not found or ImagingStudy not found in Satu Sehat"
            ),
            [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
                z.object({
                    success: z.boolean(),
                    message: z.string(),
                }),
                "Failed to fetch ImagingStudy"
            ),
        },
    }),
    async (c) => {
        try {
            const { accessionNumber } = c.req.valid("param");

            const result = await OrderService.fetchImagingStudyFromSatuSehat(accessionNumber);

            if (!result.success) {
                return c.json(
                    {
                        success: false,
                        message: result.message,
                    },
                    HttpStatusCodes.NOT_FOUND
                );
            }

            return c.json(
                {
                    success: result.success,
                    message: result.message,
                    data: result.data,
                },
                HttpStatusCodes.OK
            );
        } catch (error) {
            loggerPino.error(error);
            return c.json(
                {
                    success: false,
                    message: error instanceof Error ? error.message : "Failed to fetch ImagingStudy",
                },
                HttpStatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }
);

// ==================== FINALIZE ORDER DETAIL ====================
orderController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/orders/{id}/details/{detailId}/finalize",
        summary: "Finalize order detail and send to Satu Sehat (if encounter exists)",
        description: `
Finalize order detail by:
1. Setting status to FINAL
2. Saving observation notes and diagnostic conclusion
3. **IF encounter exists**: Send Observation and DiagnosticReport to Satu Sehat
4. **IF no encounter**: Only save data locally

**Prerequisites:**
- Order detail must be in IN_PROGRESS status
- ServiceRequest must already be sent to Satu Sehat
- Performer information must be complete

**Flow:**
- Check if order has \`id_encounter_ss\`
- **With encounter**: POST Observation → POST DiagnosticReport → Save IDs to DB
- **Without encounter**: Only update DB locally

**Response:**
- \`sent_to_satusehat\`: true if encounter exists and data sent
- \`observation_id\` and \`diagnostic_report_id\`: Only present if sent to Satu Sehat

**Use Case:**
Call this endpoint when radiology examination is completed and final report is ready.
        `,
        middleware: [authMiddleware, permissionMiddleware("update:order")] as const,
        request: {
            params: detailOrderIdParamSchema,
            body: jsonContentRequired(finalizeOrderDetailSchema, "Finalization data"),
        },
        responses: {
            [HttpStatusCodes.OK]: jsonContent(finalizeOrderDetailResponseSchema, "Order finalized successfully"),
            [HttpStatusCodes.BAD_REQUEST]: jsonContent(
                createMessageObjectSchema("Invalid status or missing data"),
                "Bad request"
            ),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(
                createMessageObjectSchema("Order or detail not found"),
                "Not found"
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
                createMessageObjectSchema("Failed to finalize order"),
                "Internal server error"
            ),
        },
    }),
    async (c) => {
        try {
            const { id: orderId, detailId } = c.req.valid("param");
            const input = c.req.valid("json");

            const result = await OrderService.finalizeOrderDetail(orderId, detailId, input);

            if (!result.success) {
                const statusCode =
                    result.message.includes("not found")
                        ? HttpStatusCodes.NOT_FOUND
                        : HttpStatusCodes.BAD_REQUEST;

                return c.json(
                    {
                        success: false,
                        message: result.message,
                        // Jangan kirim data jika gagal
                    },
                    statusCode
                );
            }

            // Selalu isi data pada response sukses
            return c.json(
                {
                    success: true,
                    message: result.message,
                    data: result.data ?? {
                        detail_id: detailId,
                        order_status: "FINAL",
                        sent_to_satusehat: false,
                    },
                },
                HttpStatusCodes.OK
            );
        } catch (error) {
            loggerPino.error(error);
            return c.json(
                {
                    success: false,
                    message: error instanceof Error ? error.message : "Failed to finalize order",
                },
                HttpStatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }
);

export default orderController;
