# 📘 Migration Guide: Implementing Response Pattern & Code Style

> **Tujuan**: Dokumen ini adalah panduan untuk merombak project Hono + Drizzle + PostgreSQL yang sudah setengah jadi agar mengikuti pattern dan style dari project ini.

---

## 🎯 Overview Pattern yang Akan Diterapkan

### Response Architecture (2-Layer System)

```
┌─────────────────────────────────────────────────────────┐
│                    HTTP Response Layer                   │
│  { content: any, message: string, errors: string[] }     │
└───────────────────┬─────────────────────────────────────┘
                    │
                    │ handleServiceErrorWithResponse()
                    │ response_success(), response_created()
                    │
┌───────────────────▼─────────────────────────────────────┐
│              Service Response Layer                      │
│  { status: boolean, data?: T, err?: ServiceError }       │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 TASK 1: Setup Base Entities

### File: `src/entities/Service.ts`

```typescript
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
export const INTERNAL_SERVER_ERROR_SERVICE_RESPONSE: ServiceResponse<{}> = {
  status: false,
  data: {},
  err: {
    message: "Internal Server Error",
    code: 500
  }
}

export const INVALID_ID_SERVICE_RESPONSE: ServiceResponse<{}> = {
  status: false,
  data: {},
  err: {
    message: "Invalid ID, Data not Found",
    code: 404
  }
}

export const UNAUTHORIZED_SERVICE_RESPONSE: ServiceResponse<{}> = {
  status: false,
  data: {},
  err: {
    message: "Unauthorized",
    code: 401
  }
}

export const FORBIDDEN_SERVICE_RESPONSE: ServiceResponse<{}> = {
  status: false,
  data: {},
  err: {
    message: "Forbidden",
    code: 403
  }
}

// Helper untuk custom error
export function BadRequestWithMessage(message: string): ServiceResponse<{}> {
  return {
    status: false,
    data: {},
    err: {
      message,
      code: 400
    }
  }
}

export function NotFoundWithMessage(message: string): ServiceResponse<{}> {
  return {
    status: false,
    data: {},
    err: {
      message,
      code: 404
    }
  }
}
```

---

## 📋 TASK 2: Setup Query Entities (Untuk Pagination & Filtering)

### File: `src/entities/Query.ts`

```typescript
export interface RangedFilter {
  key: string;
  start: any;
  end: any;
}

export interface FilteringQueryV2 {
  page?: number;
  rows?: number;
  cursor?: string;
  orderKey?: string;
  orderRule?: string;
  filters?: Record<string, any | any[] | null>;
  searchFilters?: Record<string, any | null>;
  rangedFilters?: RangedFilter[];
}

export interface PagedList<T> {
  entries: T;
  totalData: number;
  totalPage: number;
}
```

---

## 📋 TASK 3: Create Response Utils

### File: `src/utils/response.utils.ts`

```typescript
import { ServiceResponse } from "$entities/Service";
import { Context, TypedResponse } from "hono";
import { StatusCode } from "hono/utils/http-status";

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
): TypedResponse => {
  c.status(status);
  return c.json({ content, message, errors });
};

// ============= SUCCESS RESPONSES =============

/**
 * 200 OK - Request berhasil
 */
export const response_success = (
  c: Context,
  content: unknown = null,
  message = "Success"
): TypedResponse => {
  return response_handler(c, 200, content, message, []);
};

/**
 * 201 Created - Resource berhasil dibuat
 */
export const response_created = (
  c: Context,
  content: unknown = null,
  message = "Created"
): TypedResponse => {
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
): TypedResponse => {
  return response_handler(c, 400, null, message, errors);
};

/**
 * 401 Unauthorized - Belum login/tidak ada token
 */
export const response_unauthorized = (
  c: Context,
  message = "Unauthorized",
  errors: Array<string> = []
): TypedResponse => {
  return response_handler(c, 401, null, message, errors);
};

/**
 * 403 Forbidden - Login tapi tidak punya akses
 */
export const response_forbidden = (
  c: Context,
  message = "Forbidden",
  errors: Array<string> = []
): TypedResponse => {
  return response_handler(c, 403, null, message, errors);
};

/**
 * 404 Not Found - Resource tidak ditemukan
 */
export const response_not_found = (
  c: Context,
  message = "Not Found",
  errors: Array<string> = []
): TypedResponse => {
  return response_handler(c, 404, null, message, errors);
};

/**
 * 409 Conflict - Konflik data (misal: email sudah terdaftar)
 */
export const response_conflict = (
  c: Context,
  message = "Conflict",
  errors: Array<string> = []
): TypedResponse => {
  return response_handler(c, 409, null, message, errors);
};

/**
 * 422 Unprocessable Entity - Validasi gagal
 */
export const response_unprocessable_entity = (
  c: Context,
  message = "Unprocessable Entity",
  errors: Array<string> = []
): TypedResponse => {
  return response_handler(c, 422, null, message, errors);
};

/**
 * 500 Internal Server Error - Error dari server
 */
export const response_internal_server_error = (
  c: Context,
  message = "Internal Server Error",
  errors: Array<string> = []
): TypedResponse => {
  return response_handler(c, 500, null, message, errors);
};

// ============= SERVICE ERROR HANDLER =============

/**
 * Convert ServiceResponse error ke HTTP response
 * WAJIB DIGUNAKAN di controller setelah panggil service
 */
export const handleServiceErrorWithResponse = (
  c: Context,
  serviceResponse: ServiceResponse<any>
): TypedResponse => {
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
```

---

## 📋 TASK 4: Refactor Semua Services

### Pattern yang WAJIB Diikuti:

```typescript
// ❌ SALAH - Return langsung tanpa ServiceResponse
export async function getById(id: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  return user; // SALAH!
}

// ✅ BENAR - Selalu return ServiceResponse<T>
export type GetByIdResponse = User | {};
export async function getById(id: string): Promise<ServiceResponse<GetByIdResponse>> {
  try {
    const user = await db.query.users.findFirst({ 
      where: eq(users.id, id) 
    });

    if (!user) return INVALID_ID_SERVICE_RESPONSE;

    return {
      status: true,
      data: user
    };
  } catch (err) {
    console.error(`UserService.getById: ${err}`);
    return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
  }
}
```

### Checklist Refactor Service:

- [ ] Setiap function export TypeAlias untuk Response-nya
  ```typescript
  export type CreateResponse = User | {};
  export type GetAllResponse = PagedList<User[]> | {};
  export type GetByIdResponse = User | {};
  export type UpdateResponse = User | {};
  export type DeleteResponse = { deletedCount: number } | {};
  ```

- [ ] Return type selalu `Promise<ServiceResponse<XxxResponse>>`

- [ ] Semua function dibungkus try-catch

- [ ] Validasi business logic return pre-defined error:
  ```typescript
  if (!user) return INVALID_ID_SERVICE_RESPONSE;
  if (emailExists) return BadRequestWithMessage("Email already exists");
  ```

- [ ] Success response selalu:
  ```typescript
  return {
    status: true,
    data: yourData
  };
  ```

- [ ] Catch block selalu:
  ```typescript
  catch (err) {
    console.error(`ServiceName.functionName: ${err}`);
    return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
  }
  ```

---

## 📋 TASK 5: Refactor Semua Controllers

### Pattern yang WAJIB Diikuti:

```typescript
// ❌ SALAH - Handle response sendiri
export async function getById(c: Context) {
  const id = c.req.param('id');
  const user = await UserService.getById(id);
  
  if (!user) {
    return c.json({ error: 'Not found' }, 404); // SALAH!
  }
  
  return c.json({ data: user }, 200); // SALAH!
}

// ✅ BENAR - Gunakan handleServiceErrorWithResponse & response_xxx
export async function getById(c: Context): Promise<TypedResponse> {
  const id = c.req.param('id');

  const serviceResponse = await UserService.getById(id);

  if (!serviceResponse.status) {
    return handleServiceErrorWithResponse(c, serviceResponse);
  }

  return response_success(c, serviceResponse.data, "Successfully fetched User!");
}
```

### Checklist Refactor Controller:

- [ ] Import TypedResponse dari hono
- [ ] Return type: `Promise<TypedResponse>`
- [ ] Parse input dari request:
  ```typescript
  const data = await c.req.json();        // Body
  const id = c.req.param('id');           // Path param
  const page = c.req.query('page');       // Query param
  ```

- [ ] Call service dan simpan di variable `serviceResponse`

- [ ] Check status dengan pattern:
  ```typescript
  if (!serviceResponse.status) {
    return handleServiceErrorWithResponse(c, serviceResponse);
  }
  ```

- [ ] Return success dengan message yang jelas:
  ```typescript
  return response_created(c, serviceResponse.data, "Successfully created User!");
  return response_success(c, serviceResponse.data, "Successfully updated User!");
  return response_success(c, serviceResponse.data, "Successfully deleted User!");
  ```

- [ ] TIDAK ADA business logic di controller, hanya parsing & routing

---

## 📋 TASK 6: Standardize Routes

### Pattern:

```typescript
import { Hono } from "hono";
import * as UserController from "$controllers/UserController";

const UserRoutes = new Hono();

// Standard CRUD
UserRoutes.get("/", UserController.getAll);           // List with pagination
UserRoutes.get("/:id", UserController.getById);       // Get single
UserRoutes.post("/", UserController.create);          // Create
UserRoutes.put("/:id", UserController.update);        // Update
UserRoutes.delete("/", UserController.deleteByIds);   // Delete (support multiple)

export default UserRoutes;
```

### Checklist Routes:

- [ ] Gunakan `new Hono()` bukan `app.route()`
- [ ] Import controller dengan `* as XxxController`
- [ ] Mapping langsung ke controller function
- [ ] Export default
- [ ] Konsisten dengan naming:
  - `getAll` untuk list
  - `getById` untuk single item
  - `create` untuk insert
  - `update` untuk edit
  - `deleteByIds` untuk delete (bisa multiple)

---

## 📋 TASK 7: Implement Pagination (Untuk GET All)

### Di Service:

```typescript
import { FilteringQueryV2, PagedList } from "$entities/Query";
import { sql } from "drizzle-orm";

export type GetAllResponse = PagedList<User[]> | {};
export async function getAll(filters: FilteringQueryV2): Promise<ServiceResponse<GetAllResponse>> {
  try {
    const page = filters.page || 1;
    const rows = filters.rows || 10;
    const offset = (page - 1) * rows;

    // Get data dengan pagination
    const userList = await db
      .select()
      .from(users)
      .limit(rows)
      .offset(offset);

    // Count total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const totalData = Number(count);
    const totalPage = Math.ceil(totalData / rows);

    return {
      status: true,
      data: {
        entries: userList,
        totalData,
        totalPage
      }
    };
  } catch (err) {
    console.error(`UserService.getAll: ${err}`);
    return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
  }
}
```

### Di Controller:

```typescript
export async function getAll(c: Context): Promise<TypedResponse> {
  const filters: FilteringQueryV2 = {
    page: Number(c.req.query('page')) || 1,
    rows: Number(c.req.query('rows')) || 10,
    orderKey: c.req.query('orderKey') || 'createdAt',
    orderRule: c.req.query('orderRule') || 'desc'
  };

  const serviceResponse = await UserService.getAll(filters);

  if (!serviceResponse.status) {
    return handleServiceErrorWithResponse(c, serviceResponse);
  }

  return response_success(c, serviceResponse.data, "Successfully fetched all Users!");
}
```

### Response Format:

```json
{
  "content": {
    "entries": [...],
    "totalData": 100,
    "totalPage": 10
  },
  "message": "Successfully fetched all Users!",
  "errors": []
}
```

---

## 📋 TASK 8: Error Handling Best Practices

### Di Service - Berbagai Skenario:

```typescript
// 1. ID tidak valid / data tidak ditemukan
if (!data) return INVALID_ID_SERVICE_RESPONSE;

// 2. Validasi business logic
if (emailExists) {
  return BadRequestWithMessage("Email already registered");
}

if (user.role !== 'admin') {
  return {
    status: false,
    data: {},
    err: { message: "Only admin can perform this action", code: 403 }
  };
}

// 3. Unauthorized (belum login)
if (!token) return UNAUTHORIZED_SERVICE_RESPONSE;

// 4. Forbidden (sudah login tapi tidak punya akses)
if (!hasPermission) return FORBIDDEN_SERVICE_RESPONSE;

// 5. Database error (di catch block)
catch (err) {
  console.error(`ServiceName.functionName: ${err}`);
  return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
}
```

---

## 📋 TASK 9: Type Safety Checklist

### DTOs (Data Transfer Objects):

```typescript
// src/entities/User.ts
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { users } from '$db/schema';

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// DTOs untuk request
export interface UserLoginDTO {
  email: string;
  password: string;
}

export interface UserRegisterDTO {
  fullName: string;
  email: string;
  password: string;
}

export interface UserUpdateDTO {
  fullName?: string;
  email?: string;
}
```

### Checklist:

- [ ] Setiap entity punya file di `src/entities/`
- [ ] Gunakan `InferSelectModel` untuk type dari DB
- [ ] Gunakan `InferInsertModel` untuk insert operation
- [ ] Buat DTO terpisah untuk request body
- [ ] Service function selalu punya exported type alias untuk response

---

## 📋 TASK 10: Final Checklist & Testing

### Structure Checklist:

```
src/
├── db/
│   ├── client.ts           ✓ Drizzle setup
│   └── schema.ts           ✓ All tables
├── entities/
│   ├── Service.ts          ✓ ServiceResponse interface
│   ├── Query.ts            ✓ Pagination interfaces
│   └── User.ts             ✓ DTOs
├── utils/
│   └── response.utils.ts   ✓ All response functions
├── services/
│   └── UserService.ts      ✓ Business logic
├── controllers/
│   └── UserController.ts   ✓ Request handling
└── routes/
    └── UserRoutes.ts       ✓ Route definitions
```

### Testing Each Endpoint:

**1. Create (POST):**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John Doe","email":"john@example.com","password":"123456"}'
```
Expected:
```json
{
  "content": { "id": "...", "fullName": "John Doe", ... },
  "message": "Successfully created User!",
  "errors": []
}
```

**2. Get All (GET):**
```bash
curl "http://localhost:3000/api/users?page=1&rows=10"
```
Expected:
```json
{
  "content": {
    "entries": [...],
    "totalData": 50,
    "totalPage": 5
  },
  "message": "Successfully fetched all Users!",
  "errors": []
}
```

**3. Get By ID (GET):**
```bash
curl http://localhost:3000/api/users/123
```

**4. Update (PUT):**
```bash
curl -X PUT http://localhost:3000/api/users/123 \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Jane Doe"}'
```

**5. Delete (DELETE):**
```bash
curl -X DELETE "http://localhost:3000/api/users?ids=123,456"
```

### Error Testing:

- [ ] Test 404: Request dengan ID yang tidak ada
- [ ] Test 400: Request dengan data tidak valid
- [ ] Test 500: Matikan database dan test
- [ ] Test pagination: page=0, page=999, rows=-1
- [ ] Test validation: empty body, invalid email, etc

---

## 🎯 Priority Order

Kerjakan dengan urutan ini:

1. **TASK 1-3** (Setup base files) - KRUSIAL
2. **TASK 4** (Refactor 1 service sebagai contoh)
3. **TASK 5** (Refactor controller untuk service yang sudah di-refactor)
4. **TASK 6** (Setup routes)
5. **Test endpoint** yang sudah di-refactor
6. **Ulangi TASK 4-5** untuk service lainnya
7. **TASK 7** (Implement pagination)
8. **TASK 8-9** (Polish error handling & types)
9. **TASK 10** (Final testing)

---

## ⚠️ Common Mistakes to Avoid

1. ❌ Controller langsung return `c.json()` tanpa melalui `response_xxx`
2. ❌ Service return raw data tanpa `ServiceResponse<T>`
3. ❌ Tidak handle `!serviceResponse.status`
4. ❌ Business logic di controller
5. ❌ Tidak ada try-catch di service
6. ❌ Message tidak deskriptif: "Success" vs "Successfully created User!"
7. ❌ Inconsistent naming: getOne vs getById vs getSingle
8. ❌ Response format tidak konsisten

---

## 📝 Code Review Checklist

Sebelum commit, pastikan:

- [ ] Semua service return `ServiceResponse<T>`
- [ ] Semua controller return `TypedResponse`
- [ ] Tidak ada `c.json()` langsung di controller
- [ ] Semua error di-handle dengan `handleServiceErrorWithResponse`
- [ ] Success response pakai `response_success` atau `response_created`
- [ ] Try-catch ada di semua service function
- [ ] Message jelas dan konsisten
- [ ] Type safety: no `any` kecuali terpaksa
- [ ] Pagination return format `PagedList<T>`
- [ ] Console.error ada di catch block untuk debugging

---

## 🚀 Quick Start Example

Berikut contoh lengkap 1 endpoint dari awal sampai akhir:

### 1. Schema (Drizzle)
```typescript
// src/db/schema.ts
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  price: integer('price').notNull(),
  stock: integer('stock').default(0),
});

export type Product = InferSelectModel<typeof products>;
export type NewProduct = InferInsertModel<typeof products>;
```

### 2. Entity/DTO
```typescript
// src/entities/Product.ts
export interface CreateProductDTO {
  name: string;
  price: number;
  stock?: number;
}
```

### 3. Service
```typescript
// src/services/ProductService.ts
import { ServiceResponse, INTERNAL_SERVER_ERROR_SERVICE_RESPONSE } from '$entities/Service';
import { db } from '$db/client';
import { products, NewProduct } from '$db/schema';

export type CreateResponse = Product | {};
export async function create(data: NewProduct): Promise<ServiceResponse<CreateResponse>> {
  try {
    const [product] = await db.insert(products).values(data).returning();
    
    return {
      status: true,
      data: product
    };
  } catch (err) {
    console.error(`ProductService.create: ${err}`);
    return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
  }
}
```

### 4. Controller
```typescript
// src/controllers/ProductController.ts
import { Context, TypedResponse } from "hono";
import * as ProductService from "$services/ProductService";
import { handleServiceErrorWithResponse, response_created } from "$utils/response.utils";
import { CreateProductDTO } from "$entities/Product";

export async function create(c: Context): Promise<TypedResponse> {
  const data: CreateProductDTO = await c.req.json();

  const serviceResponse = await ProductService.create(data);

  if (!serviceResponse.status) {
    return handleServiceErrorWithResponse(c, serviceResponse);
  }

  return response_created(c, serviceResponse.data, "Successfully created Product!");
}
```

### 5. Routes
```typescript
// src/routes/ProductRoutes.ts
import { Hono } from "hono";
import * as ProductController from "$controllers/ProductController";

const ProductRoutes = new Hono();

ProductRoutes.post("/", ProductController.create);

export default ProductRoutes;
```

### 6. Register Route
```typescript
// src/index.ts
import ProductRoutes from './routes/ProductRoutes';

app.route('/api/products', ProductRoutes);
```

---

## 📞 Support

Jika ada yang tidak jelas saat implementasi:

1. Refer ke files reference di project ini:
   - [src/utils/response.utils.ts](src/utils/response.utils.ts)
   - [src/entities/Service.ts](src/entities/Service.ts)
   - [src/services/UserService.ts](src/services/UserService.ts)
   - [src/controllers/rest/UserController.ts](src/controllers/rest/UserController.ts)

2. Pattern yang HARUS diikuti:
   - **Service**: Try-catch + ServiceResponse
   - **Controller**: Check status + handleServiceErrorWithResponse
   - **Response**: Selalu { content, message, errors }

Good luck! 🚀
