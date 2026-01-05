import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";
import createRouter from "@/config/create-router";
import { loggerPino } from "@/config/log";
import { response_success, response_created, response_unauthorized, handleServiceErrorWithResponse } from "@/utils/response.utils";
import {
    createOrderSchema,
    detailOrderIdParamSchema,
    detailOrderResponseSchema,
    finalizeOrderDetailResponseSchema,
    finalizeOrderDetailSchema,
    fullOrderApiResponseSchema,
    fullOrderResponseSchema,
    mwlPushResponseSchema,
    orderCreationSuccessSchema,
    orderErrorResponseSchema,
    orderIdParamSchema,
    orderPaginationApiResponseSchema,
    orderPaginationResponseSchema,
    orderQuerySchema,
    updateDetailOrderSchema,
    updateOrderSchema,
} from "@/interface/order.interface";
import { authMiddleware } from "@/middleware/auth.middleware";
import { permissionMiddleware } from "@/middleware/role-permission.middleware";
import { OrderService } from "@/service/order.service";
import { createResponse } from "@/lib/utils";

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
            [HttpStatusCodes.OK]: jsonContent(orderPaginationApiResponseSchema, "Orders retrieved successfully"),
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
        const query = c.req.valid("query");
        const serviceResponse = await OrderService.getAllOrders(query);
        
        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }
        
        return response_success(c, serviceResponse.data, "Successfully fetched orders");
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
            [HttpStatusCodes.OK]: jsonContent(fullOrderApiResponseSchema, "Order retrieved successfully"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(orderErrorResponseSchema, "Order not found"),
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
        const { id } = c.req.valid("param");
        const serviceResponse = await OrderService.getOrderById(id);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Order retrieved successfully");
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
            [HttpStatusCodes.OK]: jsonContent(fullOrderApiResponseSchema, "Order retrieved successfully"),
            [HttpStatusCodes.NOT_FOUND]: jsonContent(orderErrorResponseSchema, "Order not found"),
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
        const { accessionNumber } = c.req.valid("param");
        const serviceResponse = await OrderService.getOrderByAccessionNumber(accessionNumber);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Order retrieved successfully");
    }
);

// ==================== CREATE ORDER ====================
orderController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/orders",
        summary: "Create new order from SIMRS",
        description: `
Create a new radiology order from SIMRS with new simplified format.

**Request Body:**
- \`id_pelayanan\`: Service ID from SIMRS (required)
- \`subject\`: Patient information with IHS ID
- \`encounter\`: Encounter ID
- \`requester\`: Referring physician information
- \`diagnosa\`: ICD-10 diagnosis (optional)
- \`order_priority\`: Order priority (ROUTINE, URGENT, ASAP, STAT)
- \`notes\`: Additional notes (optional)
- \`details\`: Array of LOINC examination codes (minimum 1)

**Response:**
Returns order ID and array of detail orders with generated ACSN for each examination.

**Note:**
- Each examination detail will get its own ACSN
- LOINC codes will be matched with master data in tb_loinc
- SatuSehat integration is handled by SIMRS, not RIS
        `,
        middleware: [authMiddleware, permissionMiddleware("create:order")] as const,
        request: {
            body: jsonContentRequired(createOrderSchema, "Order data with details"),
        },
        responses: {
            [HttpStatusCodes.CREATED]: jsonContent(
                z.object({
                    content: z.object({
                        data: orderCreationSuccessSchema,
                    }),
                    message: z.string(),
                    errors: z.array(z.unknown()),
                }),
                "Order created successfully"
            ),
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
        const data = c.req.valid("json");
        const user = c.get("user");

        if (!user) {
            return response_unauthorized(c, "User not found in context");
        }

        const serviceResponse = await OrderService.createOrder(data, user.id);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_created(c, serviceResponse.data, "Order created successfully");
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
        const { id } = c.req.valid("param");
        const data = c.req.valid("json");

        const serviceResponse = await OrderService.updateOrder(id, data);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Order updated successfully");
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
                return c.json(createResponse(null, "Order detail not found", HttpStatusCodes.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
            }

            return c.json(detail, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json(createResponse(null, "Failed to update order detail", HttpStatusCodes.INTERNAL_SERVER_ERROR), HttpStatusCodes.INTERNAL_SERVER_ERROR);
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
        const { id } = c.req.valid("param");
        const serviceResponse = await OrderService.deleteOrder(id);

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Order deleted successfully");
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
                return c.json(createResponse(null, "Order detail not found", HttpStatusCodes.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
            }

            return c.json(createResponse(null, "Order detail deleted successfully", HttpStatusCodes.OK), HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json(createResponse(null, "Failed to delete order detail", HttpStatusCodes.INTERNAL_SERVER_ERROR), HttpStatusCodes.INTERNAL_SERVER_ERROR);
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
                return c.json(createResponse(null, "Order detail not found", HttpStatusCodes.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
            }

            return c.json(detail, HttpStatusCodes.OK);
        } catch (error) {
            loggerPino.error(error);
            return c.json(createResponse(null, "Failed to fetch order detail", HttpStatusCodes.INTERNAL_SERVER_ERROR), HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
);

// ==================== PUSH ORDER TO MWL ====================
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

// ==================== FINALIZE ORDER DETAIL ====================
orderController.openapi(
    createRoute({
        tags,
        method: "post",
        path: "/api/orders/{id}/details/{detailId}/finalize",
        summary: "Finalize order detail (local only - no SatuSehat)",
        description: `
Finalize order detail by:
1. Setting status to FINAL
2. Saving observation notes and diagnostic conclusion

**Prerequisites:**
- Order detail must be in IN_PROGRESS status

**Flow:**
- Update order status to FINAL
- Save observation notes and diagnostic conclusion to database

**Note:**
- SatuSehat integration is handled by SIMRS, not RIS

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
