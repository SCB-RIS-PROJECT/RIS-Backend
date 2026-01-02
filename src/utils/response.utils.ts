import type { ServiceResponse } from "@/entities/Service";
import type { Context } from "hono";
import type { StatusCode } from "hono/utils/http-status";

/**
 * Base response handler - JANGAN DIGUNAKAN LANGSUNG DI CONTROLLER
 * @internal
 */
const response_handler = (
    c: Context,
    status: StatusCode,
    content: unknown = null,
    message = "",
    errors: Array<string> = []
): any => {
    c.status(status);
    return c.json({ content, message, errors });
};

// ============= SUCCESS RESPONSES =============

/**
 * 200 OK - Request berhasil
 */
export const response_success = (c: Context, content: unknown = null, message = "Success") => {
    return response_handler(c, 200, content, message, []);
};

/**
 * 201 Created - Resource berhasil dibuat
 */
export const response_created = (c: Context, content: unknown = null, message = "Created") => {
    return response_handler(c, 201, content, message, []);
};

// ============= ERROR RESPONSES =============

/**
 * 400 Bad Request - Request tidak valid
 */
export const response_bad_request = (
    c: Context,
    message = "Bad Request",
    errors: Array<string> = []
) => {
    return response_handler(c, 400, null, message, errors);
};

/**
 * 401 Unauthorized - Belum login/tidak ada token
 */
export const response_unauthorized = (
    c: Context,
    message = "Unauthorized",
    errors: Array<string> = []
) => {
    return response_handler(c, 401, null, message, errors);
};

/**
 * 403 Forbidden - Login tapi tidak punya akses
 */
export const response_forbidden = (
    c: Context,
    message = "Forbidden",
    errors: Array<string> = []
) => {
    return response_handler(c, 403, null, message, errors);
};

/**
 * 404 Not Found - Resource tidak ditemukan
 */
export const response_not_found = (
    c: Context,
    message = "Not Found",
    errors: Array<string> = []
) => {
    return response_handler(c, 404, null, message, errors);
};

/**
 * 409 Conflict - Konflik data (misal: email sudah terdaftar)
 */
export const response_conflict = (
    c: Context,
    message = "Conflict",
    errors: Array<string> = []
) => {
    return response_handler(c, 409, null, message, errors);
};

/**
 * 422 Unprocessable Entity - Validasi gagal
 */
export const response_unprocessable_entity = (
    c: Context,
    message = "Unprocessable Entity",
    errors: Array<string> = []
) => {
    return response_handler(c, 422, null, message, errors);
};

/**
 * 500 Internal Server Error - Error dari server
 */
export const response_internal_server_error = (
    c: Context,
    message = "Internal Server Error",
    errors: Array<string> = []
) => {
    return response_handler(c, 500, null, message, errors);
};

// ============= SERVICE ERROR HANDLER =============

/**
 * Convert ServiceResponse error ke HTTP response
 * WAJIB DIGUNAKAN di controller setelah panggil service
 */
export const handleServiceErrorWithResponse = (c: Context, serviceResponse: ServiceResponse<any>) => {
    switch (serviceResponse.err?.code) {
        case 400:
            return response_bad_request(c, serviceResponse.err?.message);
        case 401:
            return response_unauthorized(c, serviceResponse.err?.message);
        case 403:
            return response_forbidden(c, serviceResponse.err?.message);
        case 404:
            return response_not_found(c, serviceResponse.err?.message);
        case 409:
            return response_conflict(c, serviceResponse.err?.message);
        case 422:
            return response_unprocessable_entity(c, serviceResponse.err?.message);
        default:
            return response_internal_server_error(c, serviceResponse.err?.message);
    }
};
