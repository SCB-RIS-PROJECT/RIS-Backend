# API Integration Documentation for SIMRS
## RIS Order Creation API

**Base URL (Development):** `http://dev.verd.net.id:8001`

**Endpoint:** `POST /api/orders/simrs`

**Authentication:** Bearer Token

---

## Overview

API ini digunakan untuk membuat order pemeriksaan radiologi dari SIMRS ke RIS. Setelah order dibuat, RIS akan:
1. Generate Accession Number (ACSN) dengan format: `{MODALITY}{YYYYMMDD}{SEQ}`
2. Simpan data order untuk workflow radiologi
3. Return simple success message

**Note:** Pengiriman ServiceRequest ke Satu Sehat akan dilakukan setelah order dilengkapi oleh RIS, bukan langsung saat order dibuat.

---

## Authentication

### Step 1: Login to Get Access Token

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "simrs@simrs.com",
  "password": "simrs123"
}
```

**cURL Example:**
```bash
curl --location 'http://dev.verd.net.id:8001/api/auth/login' \
--header 'Content-Type: application/json' \
--data-raw '{
  "email": "simrs@simrs.com",
  "password": "simrs123"
}'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 604800,
    "user": {
      "id": "3fc861eb-24a6-4b6a-a3b0-f6fc340d7017",
      "name": "SIMRS User",
      "email": "simrs@simrs.com",
      "roles": ["simrs"],
      "permissions": ["order:create", "order:read"]
    }
  }
}
```

### Step 2: Use Access Token

Gunakan Bearer Token dari response login pada header request:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:**
- Token berlaku selama 7 hari (604800 detik)
- Simpan token dengan aman
- Jika token expired, lakukan login ulang

---

## Request Specification

### Headers

```http
Content-Type: application/json
Authorization: Bearer <your_access_token>
```

### Request Body Schema

```json
{
  "id_pelayanan": "string (optional)",
  "details": [
    {
      "ccurence_date_time": "string (ISO 8601 datetime, optional)",
      "order_priority": "ROUTINE | URGENT | STAT (default: ROUTINE)",
      "notes": "string (optional)",
      "pemeriksaan": {
        "system": "string (LOINC system URL, e.g., http://loinc.org)",
        "code": "string (LOINC code)",
        "display": "string (LOINC display name)",
        "text": "string (procedure description)"
      },
      "subject": {
        "ihs_id": "string (Satu Sehat Patient IHS ID, required)",
        "patient_name": "string (required)",
        "patient_mrn": "string (required)",
        "patient_birth_date": "string (YYYY-MM-DD, required)",
        "patient_age": "number (required)",
        "patient_gender": "MALE | FEMALE (required)"
      },
      "encounter": {
        "encounter_id": "string (Satu Sehat Encounter ID, required)"
      },
      "requester": {
        "id_practitioner": "string (Satu Sehat Practitioner ID, required)",
        "name_practitioner": "string (practitioner name, required)"
      },
      "diagnosa": {
        "system": "string (ICD-10 system URL, e.g., http://hl7.org/fhir/sid/icd-10)",
        "code": "string (ICD-10 code)",
        "display": "string (ICD-10 description)"
      }
    }
  ]
}
```

---

## Request Example

```json
{
  "id_pelayanan": "PEL-1766652792162",
  "details": [
    {
      "ccurence_date_time": "2025-12-26T03:00:00.000Z",
      "order_priority": "ROUTINE",
      "notes": "Pasien tidak puasa",
      "pemeriksaan": {
        "system": "http://loinc.org",
        "code": "36687-2",
        "display": "XR Chest AP and Lateral",
        "text": "Pemeriksaan X-Ray Thorax PA"
      },
      "subject": {
        "ihs_id": "P20394967103",
        "patient_name": "DUNSTAN GAGG",
        "patient_mrn": "MR-2023-0001",
        "patient_birth_date": "1933-07-10",
        "patient_age": 92,
        "patient_gender": "MALE"
      },
      "encounter": {
        "encounter_id": "582d7754-bc45-4119-9b41-1aadff6a1f4c"
      },
      "requester": {
        "id_practitioner": "10009880728",
        "name_practitioner": "dr. Siti Aminah, Sp.PD"
      },
      "diagnosa": {
        "system": "http://hl7.org/fhir/sid/icd-10",
        "code": "J18.9",
        "display": "Pneumonia, unspecified organism"
      }
    }
  ]
}
```

---

## Response Specification

### Success Response (HTTP 200)

```json
{
  "success": true,
  "message": "Order created successfully"
}
```

### Error Response (HTTP 4xx/5xx)

```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "field_name",
      "message": "Error description"
    }
  ]
}
```

---

## HTTP Status Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success - Order created successfully |
| 400 | Bad Request - Invalid request body or validation error |
| 401 | Unauthorized - Missing or invalid authentication token |
| 403 | Forbidden - User doesn't have permission |
| 500 | Internal Server Error - Server error |

---

## Important Notes

### 1. **Accession Number (ACSN) Format**
- Format: `{MODALITY}{YYYYMMDD}{SEQ}`
- Contoh: `DX20251225002`
  - `DX` = Modality code
  - `20251225` = Date (25 Desember 2025)
  - `002` = Sequence number (auto-increment per day)

### 2. **Modality Codes**
Gunakan standard DICOM modality codes:
- `DX` - Digital Radiography (X-Ray)
- `CT` - Computed Tomography
- `MR` - Magnetic Resonance
- `US` - Ultrasound
- `MG` - Mammography
- `NM` - Nuclear Medicine
- `PT` - Positron Emission Tomography
- `XA` - X-Ray Angiography

### 3. **Order Priority**
- `ROUTINE` - Normal priority (default)
- `URGENT` - High priority
- `STAT` - Immediate/Emergency

### 4. **Patient Gender**
- `MALE` - Laki-laki
- `FEMALE` - Perempuan

### 5. **Satu Sehat Integration**
- RIS **TIDAK** langsung mengirim ServiceRequest ke Satu Sehat setelah order dibuat
- Order akan dilengkapi/diupdate terlebih dahulu oleh RIS
- Setelah order lengkap, RIS akan mengirim ServiceRequest ke Satu Sehat
- SIMRS hanya perlu mengirim data order dan menerima response message

### 6. **Required Fields**
Minimal field yang wajib ada:
- `pemeriksaan` (LOINC code with system, code, display, text)
- `subject` (patient data including ihs_id)
- `encounter` (encounter_id)
- `requester` (id_practitioner and name_practitioner)
- `diagnosa` (ICD-10 code with system, code, display)

---

## Complete Flow Example

### 1. Login First
```bash
curl --location 'http://dev.verd.net.id:8001/api/auth/login' \
--header 'Content-Type: application/json' \
--data-raw '{
  "email": "simrs@simrs.com",
  "password": "simrs123"
}'
```

### 2. Create Order with Token
```bash
curl --location 'http://dev.verd.net.id:8001/api/orders/simrs' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_ACCESS_TOKEN_FROM_LOGIN' \
--data '{
  "id_pelayanan": "PEL-1766652792162",
  "details": [
    {
      "ccurence_date_time": "2025-12-26T03:00:00.000Z",
      "order_priority": "ROUTINE",
      "notes": "Pasien tidak puasa",
      "pemeriksaan": {
        "system": "http://loinc.org",
        "code": "36687-2",
        "display": "XR Chest AP and Lateral",
        "text": "Pemeriksaan X-Ray Thorax PA"
      },
      "subject": {
        "ihs_id": "P20394967103",
        "patient_name": "DUNSTAN GAGG",
        "patient_mrn": "MR-2023-0001",
        "patient_birth_date": "1933-07-10",
        "patient_age": 92,
        "patient_gender": "MALE"
      },
      "encounter": {
        "encounter_id": "582d7754-bc45-4119-9b41-1aadff6a1f4c"
      },
      "requester": {
        "id_practitioner": "10009880728",
        "name_practitioner": "dr. Siti Aminah, Sp.PD"
      },
      "diagnosa": {
        "system": "http://hl7.org/fhir/sid/icd-10",
        "code": "J18.9",
        "display": "Pneumonia, unspecified organism"
      }
    }
  ]
}'
```

---

## Common Error Scenarios

### 1. Missing Required Fields
**Error:**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "subject",
      "message": "Patient information is required"
    }
  ]
}
```

### 2. Invalid Request Body
**Error:**
```json
{
  "success": false,
  "message": "Invalid request body"
}
```

---

## Test Account

Untuk testing integrasi, gunakan akun berikut:

| Field | Value |
|-------|-------|
| Email | `simrs@simrs.com` |
| Password | `simrs123` |
| Roles | `simrs` |
| Permissions | `order:create`, `order:read` |

**Note:** Jangan gunakan akun ini di production!

---

## Troubleshooting

### 1. Token Expired
**Error:**
```json
{
  "success": false,
  "message": "Token expired"
}
```
**Solution:** Login ulang untuk mendapatkan token baru

### 2. Unauthorized (401)
**Error:**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```
**Solution:** 
- Pastikan token ada di header `Authorization: Bearer <token>`
- Pastikan format token benar
- Pastikan token belum expired

### 3. Forbidden (403)
**Error:**
```json
{
  "success": false,
  "message": "Forbidden - Insufficient permissions"
}
```
**Solution:** Akun tidak memiliki permission yang diperlukan. Gunakan akun `simrs@simrs.com`

---

## Support & Contact

Untuk pertanyaan atau issue terkait integrasi API:
- Email: support@ris.example.com
- Developer: RIS Development Team

---

**Last Updated:** December 26, 2025  
**API Version:** 1.1  
**Document Version:** 1.1
