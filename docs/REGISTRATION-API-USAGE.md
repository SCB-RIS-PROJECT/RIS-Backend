# Registration API Usage Guide

## Overview
Sistem sekarang mendukung 2 jenis registrasi:
1. **User Biasa** - untuk admin, staff, dll (tidak terhubung dengan practitioner)
2. **Practitioner** - untuk dokter/radiografer yang bisa login (terhubung dengan data practitioner)

## Database Schema

### Relasi User - Practitioner
- Tabel `tb_user` memiliki kolom `practitioner_id` (nullable, FK ke `tb_practitioner`)
- User yang bukan practitioner: `practitioner_id = NULL`
- User yang practitioner: `practitioner_id = <uuid_practitioner>`
- Satu practitioner hanya bisa punya 1 user account

## Endpoints

### 1. Register User Biasa
**POST** `/api/auth/register`

Untuk mendaftarkan user non-practitioner (admin, staff, dll)

**Request Body:**
```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response (201 Created):**
```json
{
  "content": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "name": "Admin User",
      "email": "admin@example.com",
      "avatar": null,
      "practitioner_id": null,
      "email_verified_at": null,
      "created_at": "2026-01-05T10:00:00Z",
      "updated_at": null,
      "roles": [],
      "permissions": []
    }
  },
  "message": "User registered successfully!",
  "errors": []
}
```

### 2. Register Practitioner
**POST** `/api/auth/register-practitioner`

Untuk mendaftarkan practitioner yang bisa login (dokter, radiografer, dll)

**Request Body:**
```json
{
  "email": "dr.john@example.com",
  "password": "password123",
  "nik": "1234567890123456",
  "name": "Dr. John Doe",
  "gender": "MALE",
  "birth_date": "1985-05-15T00:00:00Z",
  "profession": "DOCTOR",
  "phone": "08123456789",
  "address": "Jl. Contoh No. 123",
  "id_province": "31",
  "province": "DKI Jakarta",
  "id_city": "3171",
  "city": "Jakarta Pusat",
  "id_district": "317101",
  "district": "Gambir",
  "id_sub_district": "3171011",
  "sub_district": "Gambir",
  "rt": "001",
  "rw": "002",
  "postal_code": "10110",
  "ihs_number": "123456789012"
}
```

**Required Fields:**
- `email`: Email untuk login
- `password`: Password (min 8 karakter)
- `nik`: NIK 16 digit (harus unique)
- `name`: Nama practitioner
- `gender`: "MALE" atau "FEMALE"
- `birth_date`: Tanggal lahir (ISO 8601)
- `profession`: Salah satu dari ["DOCTOR", "RADIOGRAPHER", "NURSE", "MIDWIFE", "PHARMACIST", "NUTRITIONIST", "PHYSIOTHERAPIST", "MEDICAL_ANALYST", "OTHER"]

**Optional Fields:**
- `phone`, `address`, `id_province`, `province`, `id_city`, `city`, `id_district`, `district`, `id_sub_district`, `sub_district`, `rt`, `rw`, `postal_code`, `ihs_number`

**Response (201 Created):**
```json
{
  "content": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-user",
      "name": "Dr. John Doe",
      "email": "dr.john@example.com",
      "avatar": null,
      "practitioner_id": "uuid-practitioner",
      "email_verified_at": null,
      "created_at": "2026-01-05T10:00:00Z",
      "updated_at": null,
      "roles": [],
      "permissions": [],
      "practitioner": {
        "id": "uuid-practitioner",
        "nik": "1234567890123456",
        "name": "Dr. John Doe",
        "profession": "DOCTOR",
        "gender": "MALE",
        "phone": "08123456789",
        "email": "dr.john@example.com"
      }
    }
  },
  "message": "Practitioner registered successfully!",
  "errors": []
}
```

### 3. Login (Existing)
**POST** `/api/auth/login`

Login untuk semua user (baik practitioner maupun non-practitioner)

**Request Body:**
```json
{
  "email": "dr.john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "content": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "name": "Dr. John Doe",
      "email": "dr.john@example.com",
      "avatar": null,
      "practitioner_id": "uuid-practitioner",
      "email_verified_at": null,
      "created_at": "2026-01-05T10:00:00Z",
      "updated_at": null,
      "roles": [],
      "permissions": []
    }
  },
  "message": "Login successful!",
  "errors": []
}
```

### 4. Get Current User
**GET** `/api/auth/current`

Mendapatkan data user yang sedang login (termasuk data practitioner jika ada)

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "content": {
    "data": {
      "id": "uuid",
      "name": "Dr. John Doe",
      "email": "dr.john@example.com",
      "avatar": null,
      "practitioner_id": "uuid-practitioner",
      "email_verified_at": null,
      "created_at": "2026-01-05T10:00:00Z",
      "updated_at": null,
      "roles": [],
      "permissions": [],
      "practitioner": {
        "id": "uuid-practitioner",
        "nik": "1234567890123456",
        "name": "Dr. John Doe",
        "profession": "DOCTOR",
        "gender": "MALE",
        "phone": "08123456789",
        "email": "dr.john@example.com"
      }
    }
  },
  "message": "Current user retrieved successfully!",
  "errors": []
}
```

## Error Responses

### Email Already Registered (409 Conflict)
```json
{
  "content": {
    "data": null
  },
  "message": "Email already registered",
  "errors": []
}
```

### NIK Already Registered (409 Conflict)
```json
{
  "content": {
    "data": null
  },
  "message": "NIK already registered",
  "errors": []
}
```

### Validation Error (422 Unprocessable Entity)
```json
{
  "content": {
    "data": null
  },
  "message": "Validation error",
  "errors": [
    {
      "field": "nik",
      "message": "NIK must be exactly 16 characters"
    },
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## Use Cases

### Scenario 1: Register Admin/Staff
1. POST `/api/auth/register` dengan data user biasa
2. User terdaftar dengan `practitioner_id = null`
3. User bisa login dan mengakses sistem sesuai role

### Scenario 2: Register Practitioner untuk Login
1. POST `/api/auth/register-practitioner` dengan data lengkap
2. System create:
   - Record di `tb_practitioner`
   - Record di `tb_user` dengan `practitioner_id` terisi
3. Practitioner bisa login dengan email & password
4. Saat login/current, response include data practitioner

### Scenario 3: Practitioner Sudah Ada, Buat User
Jika practitioner sudah ada di sistem (dari sync SatuSehat atau manual entry):
1. Query practitioner yang belum punya user account
2. Buat user baru dan link ke practitioner:
   ```sql
   INSERT INTO tb_user (name, email, password, practitioner_id)
   VALUES ('Dr. John', 'john@example.com', 'hashed_pass', 'uuid-practitioner');
   ```

## Notes

1. **Semua user bisa login** - baik yang practitioner maupun tidak
2. **Tidak wajib semua user adalah practitioner** - admin/staff tidak perlu data practitioner
3. **Tidak wajib semua practitioner punya user** - practitioner bisa ada di sistem hanya sebagai data master
4. **Token JWT sama** - tidak ada perbedaan autentikasi antara practitioner dan non-practitioner
5. **Field `practitioner`** di response hanya muncul jika user adalah practitioner
6. **Migration sudah dijalankan** - kolom `practitioner_id` sudah ada di database

## Testing

### Test Register User Biasa
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@test.com",
    "password": "password123"
  }'
```

### Test Register Practitioner
```bash
curl -X POST http://localhost:3000/api/auth/register-practitioner \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dr.test@example.com",
    "password": "password123",
    "nik": "1234567890123456",
    "name": "Dr. Test",
    "gender": "MALE",
    "birth_date": "1985-05-15T00:00:00Z",
    "profession": "DOCTOR",
    "phone": "08123456789"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dr.test@example.com",
    "password": "password123"
  }'
```

### Test Get Current User
```bash
curl -X GET http://localhost:3000/api/auth/current \
  -H "Authorization: Bearer <your-token>"
```
