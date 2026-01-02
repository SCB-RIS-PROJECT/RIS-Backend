# Response Pattern Implementation

## Overview

Dokumen ini menjelaskan implementasi 2-layer response architecture yang telah diterapkan ke project RIS-Backend sesuai dengan pattern dari MIGRATION_GUIDE.md.

## Architecture

### 1. Service Response Layer (Internal)

Services mengembalikan `ServiceResponse<T>`:

```typescript
interface ServiceResponse<T> {
    data?: T;
    err?: ServiceError;
    status: boolean;
}

interface ServiceError {
    message: string;
    code: number;
}
```

**Contoh Success Response:**
```typescript
return {
    status: true,
    data: patient
};
```

**Contoh Error Response:**
```typescript
return {
    status: false,
    data: {},
    err: {
        message: "Patient not found",
        code: 404
    }
};
```

### 2. HTTP Response Layer (External)

Controllers mengonversi ServiceResponse menjadi HTTP response:

```typescript
{
    content: any,      // Data yang akan dikembalikan
    message: string,   // Pesan deskriptif
    errors: string[]   // Array error messages (jika ada)
}
```

## Files Created

### 1. `/src/entities/Service.ts`

Berisi:
- `ServiceResponse<T>` interface
- Pre-defined error responses:
  - `INTERNAL_SERVER_ERROR_SERVICE_RESPONSE`
  - `INVALID_ID_SERVICE_RESPONSE`
  - `UNAUTHORIZED_SERVICE_RESPONSE`
  - `FORBIDDEN_SERVICE_RESPONSE`
- Helper functions:
  - `BadRequestWithMessage()`
  - `NotFoundWithMessage()`
  - `ConflictWithMessage()`
  - `UnprocessableEntityWithMessage()`

### 2. `/src/entities/Query.ts`

Berisi interface untuk pagination dan filtering:
- `FilteringQueryV2`
- `PagedList<T>`
- `RangedFilter`

### 3. `/src/utils/response.utils.ts`

Response helper functions:

**Success Responses:**
- `response_success()` - 200 OK
- `response_created()` - 201 Created

**Error Responses:**
- `response_bad_request()` - 400
- `response_unauthorized()` - 401
- `response_forbidden()` - 403
- `response_not_found()` - 404
- `response_conflict()` - 409
- `response_unprocessable_entity()` - 422
- `response_internal_server_error()` - 500

**Error Handler:**
- `handleServiceErrorWithResponse()` - Converts ServiceResponse error to HTTP response

## Refactored Modules

### Patient Module ✅

**Service (`src/service/patient.service.ts`):**
- `getAllPatients()` → Returns `ServiceResponse<PagedList<PatientResponse[]>>`
- `getPatientById()` → Returns `ServiceResponse<PatientResponse>`
- `createPatient()` → Returns `ServiceResponse<PatientResponse>`
- `updatePatient()` → Returns `ServiceResponse<PatientResponse>`
- `deletePatient()` → Returns `ServiceResponse<{ deletedCount: number }>`

**Controller (`src/controller/patient.controller.ts`):**
- Uses `response_success()` for successful operations
- Uses `response_created()` for POST operations
- Uses `handleServiceErrorWithResponse()` for errors

### LOINC Module ✅

**Service (`src/service/loinc.service.ts`):**
- `getAllLoinc()` → Returns `ServiceResponse<PagedList<LoincResponse[]>>`
- `getLoincById()` → Returns `ServiceResponse<LoincResponse>`
- `createLoinc()` → Returns `ServiceResponse<LoincResponse>`
- `updateLoinc()` → Returns `ServiceResponse<LoincResponse>`
- `deleteLoinc()` → Returns `ServiceResponse<{ deletedCount: number }>`

**Controller (`src/controller/loinc.controller.ts`):**
- Implemented same pattern as Patient controller

### Practitioner Module ✅

**Service (`src/service/practitioner.service.ts`):**
- `getAllPractitioners()` → Returns `ServiceResponse<PagedList<PractitionerResponse[]>>`
- `getPractitionerById()` → Returns `ServiceResponse<PractitionerResponse>`
- `createPractitioner()` → Returns `ServiceResponse<PractitionerResponse>`
- `updatePractitioner()` → Returns `ServiceResponse<PractitionerResponse>`
- `deletePractitioner()` → Returns `ServiceResponse<{ deletedCount: number }>`

**Controller (`src/controller/practitioner.controller.ts`):**
- Implemented same pattern as other controllers

## Usage Examples

### Service Implementation

```typescript
// src/service/patient.service.ts
import {
    ServiceResponse,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
} from "@/entities/Service";

static async getPatientById(patientId: string): Promise<ServiceResponse<PatientResponse>> {
    try {
        const [patient] = await db
            .select()
            .from(patientTable)
            .where(eq(patientTable.id, patientId))
            .limit(1);

        if (!patient) return INVALID_ID_SERVICE_RESPONSE;

        return {
            status: true,
            data: PatientService.formatPatientResponse(patient),
        };
    } catch (err) {
        console.error(`PatientService.getPatientById: ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
```

### Controller Implementation

```typescript
// src/controller/patient.controller.ts
import {
    response_success,
    response_created,
    handleServiceErrorWithResponse,
} from "@/utils/response.utils";

async (c) => {
    const { id } = c.req.valid("param");
    const serviceResponse = await PatientService.getPatientById(id);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(c, serviceResponse.data, "Successfully fetched Patient!");
}
```

## Response Format Examples

### Success Response (GET)

```json
{
    "content": {
        "id": "123",
        "name": "John Doe",
        ...
    },
    "message": "Successfully fetched Patient!",
    "errors": []
}
```

### Success Response (GET All with Pagination)

```json
{
    "content": {
        "entries": [
            { "id": "1", "name": "John" },
            { "id": "2", "name": "Jane" }
        ],
        "totalData": 50,
        "totalPage": 5
    },
    "message": "Successfully fetched all Patients!",
    "errors": []
}
```

### Error Response

```json
{
    "content": null,
    "message": "Invalid ID, Data not Found",
    "errors": []
}
```

## Benefits

1. **Separation of Concerns**: Business logic (service) terpisah dari HTTP concerns (controller)
2. **Consistent Error Handling**: Semua error dihandle dengan cara yang sama
3. **Type Safety**: ServiceResponse<T> provides full type safety
4. **Easier Testing**: Service dapat di-test tanpa HTTP context
5. **Better Debugging**: Console.error di setiap catch block dengan context
6. **Reusable**: Pre-defined error responses dan helper functions

## Pattern Checklist

### When Creating New Service:

- [ ] Import `ServiceResponse` dan pre-defined errors dari `@/entities/Service`
- [ ] Return type: `Promise<ServiceResponse<T>>`
- [ ] Wrap semua function dalam try-catch
- [ ] Return `{ status: true, data: ... }` untuk success
- [ ] Return pre-defined error atau custom error untuk failures
- [ ] Console.error di catch block: `console.error(\`ServiceName.functionName: \${err}\`)`

### When Creating New Controller:

- [ ] Import response utils: `response_success`, `response_created`, `handleServiceErrorWithResponse`
- [ ] Call service dan simpan di `serviceResponse`
- [ ] Check `!serviceResponse.status` → return `handleServiceErrorWithResponse()`
- [ ] Return `response_success()` atau `response_created()` dengan message yang jelas
- [ ] TIDAK ADA business logic di controller

## Migration Status

- ✅ Base entities created (Service.ts, Query.ts)
- ✅ Response utils created (response.utils.ts)
- ✅ Patient module refactored (Service + Controller)
- ✅ LOINC module refactored (Service + Controller)
- ✅ Practitioner module refactored (Service + Controller)
- ✅ Modality module refactored (Service + Controller)
- ✅ Auth module refactored (Service + Controller)
- ⏳ Order module (PARTIAL - service terlalu kompleks 2197 lines, needs dedicated refactoring)
- ⏳ User service (TO DO - used by Auth)
- ⏳ Satu Sehat service (TO DO - 627 lines, complex FHIR integration)
- ⏳ Role Permission service (TO DO - auth related)

### Completed Modules Detail

#### ✅ Patient Module
- **Service Methods**: getAllPatients, getPatientById, createPatient, updatePatient, deletePatient
- **Controller Endpoints**: GET /api/patients, GET /api/patients/:id, POST /api/patients, PATCH /api/patients/:id, DELETE /api/patients/:id
- **Response Format**: Consistent { content, message, errors } pattern

#### ✅ LOINC Module
- **Service Methods**: getAllLoinc, getLoincById, createLoinc, updateLoinc, deleteLoinc
- **Controller Endpoints**: GET /api/loinc, GET /api/loinc/:id, POST /api/loinc, PATCH /api/loinc/:id, DELETE /api/loinc/:id
- **Response Format**: Consistent pattern with modality relationship

#### ✅ Practitioner Module
- **Service Methods**: getAllPractitioners, getPractitionerById, createPractitioner, updatePractitioner, deletePractitioner
- **Controller Endpoints**: GET /api/practitioners, GET /api/practitioners/:id, POST /api/practitioners, PATCH /api/practitioners/:id, DELETE /api/practitioners/:id
- **Response Format**: Consistent pattern

#### ✅ Modality Module
- **Service Methods**: getAllModalities, getModalityById, createModality, updateModality, deleteModality
- **Controller Endpoints**: GET /api/modalities, GET /api/modalities/:id, POST /api/modalities, PATCH /api/modalities/:id, DELETE /api/modalities/:id
- **Response Format**: Consistent pattern

#### ✅ Auth Module
- **Service Methods**: login, logout, current
- **Controller Endpoints**: POST /api/auth/login, DELETE /api/auth/logout, GET /api/auth/current
- **Special Notes**: Login returns { token, user } in data. Error messages are descriptive ("Invalid email or password")

## Next Steps

1. Refactor remaining modules (Order, Modality, Auth, Satu Sehat)
2. Update OpenAPI schemas to reflect new response format
3. Add integration tests
4. Update Postman collection with new response format

## References

- [MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md) - Complete migration guide
- [Service.ts](../src/entities/Service.ts) - ServiceResponse definitions
- [response.utils.ts](../src/utils/response.utils.ts) - Response helper functions
