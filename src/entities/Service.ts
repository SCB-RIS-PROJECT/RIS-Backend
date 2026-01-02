export interface ServiceResponse<T> {
    data?: T;
    err?: ServiceError;
    status: boolean;
}

interface ServiceError {
    message: string;
    code: number;
}

// Pre-defined error responses
export const INTERNAL_SERVER_ERROR_SERVICE_RESPONSE: ServiceResponse<any> = {
    status: false,
    data: {},
    err: {
        message: "Internal Server Error",
        code: 500,
    },
};

export const INVALID_ID_SERVICE_RESPONSE: ServiceResponse<any> = {
    status: false,
    data: {},
    err: {
        message: "Invalid ID, Data not Found",
        code: 404,
    },
};

export const UNAUTHORIZED_SERVICE_RESPONSE: ServiceResponse<any> = {
    status: false,
    data: {},
    err: {
        message: "Unauthorized",
        code: 401,
    },
};

export const FORBIDDEN_SERVICE_RESPONSE: ServiceResponse<any> = {
    status: false,
    data: {},
    err: {
        message: "Forbidden",
        code: 403,
    },
};

// Helper untuk custom error
export function BadRequestWithMessage(message: string): ServiceResponse<any> {
    return {
        status: false,
        data: {},
        err: {
            message,
            code: 400,
        },
    };
}

export function NotFoundWithMessage(message: string): ServiceResponse<any> {
    return {
        status: false,
        data: {},
        err: {
            message,
            code: 404,
        },
    };
}

export function ConflictWithMessage(message: string): ServiceResponse<any> {
    return {
        status: false,
        data: {},
        err: {
            message,
            code: 409,
        },
    };
}

export function UnprocessableEntityWithMessage(message: string): ServiceResponse<any> {
    return {
        status: false,
        data: {},
        err: {
            message,
            code: 422,
        },
    };
}
