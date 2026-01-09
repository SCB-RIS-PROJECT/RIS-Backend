# SIMRS API Documentation - RIS Integration

## 📋 Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [API Endpoints for SIMRS](#api-endpoints-for-simrs)
- [Complete Flow Examples](#complete-flow-examples)
- [Error Handling](#error-handling)
- [Status Codes](#status-codes)

---

## Overview

Dokumentasi ini menjelaskan API endpoints yang digunakan oleh **SIMRS** untuk integrasi dengan sistem **RIS (Radiology Information System)**.

### Tanggung Jawab SIMRS vs RIS

| Sistem | Tanggung Jawab |
|--------|----------------|
| **SIMRS** | - Membuat order radiologi<br>- Mengirim data pasien & encounter<br>- Integrasi dengan Satu Sehat (ServiceRequest)<br>- Monitoring status order |
| **RIS** | - Menerima order dari SIMRS<br>- Manajemen workflow radiologi<br>- Assignment modality & radiolog<br>- Push to MWL (Modality Worklist)<br>- Generate hasil pemeriksaan |

---

## Authentication

Semua API endpoint memerlukan JWT token authentication.

### Headers Required:
```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

### Mendapatkan Token:
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "your-email@hospital.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "status": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-id",
      "email": "your-email@hospital.com",
      "name": "Your Name"
    }
  }
}
```

---

## Base URL

```
Development: http://localhost:8001
Production: http://192.168.251.206:8001
```

---

## API Endpoints for SIMRS

### 1. 🆕 Create Order

**Endpoint:** `POST /api/orders`

**Permission Required:** `create:order`

**Description:**
Endpoint ini digunakan oleh SIMRS untuk membuat order radiologi baru. Setiap pemeriksaan (LOINC) akan mendapatkan Accession Number (ACSN) tersendiri.

**Request Body:**
```json
{
  "id_pelayanan": "PELAYANAN-2025-001",
  "subject": {
    "patient_name": "John Doe",
    "patient_mrn": "MRN123456",
    "patient_birth_date": "1990-05-15",
    "patient_age": 35,
    "patient_gender": "MALE",
    "ihs_id": "P02478375538"
  },
  "encounter": {
    "encounter_id": "e47e5146-a6cf-4994-b0d3-873a4e2f4a8c"
  },
  "requester": {
    "id_practitioner": "N10000001",
    "name_practitioner": "dr. Jane Smith, Sp.PD"
  },
  "diagnosa": {
    "code": "A15.0",
    "display": "Tuberculosis of lung"
  },
  "order_priority": "ROUTINE",
  "notes": "Patient complains of persistent cough",
  "details": [
    {
      "id_loinc": "loinc-uuid-1"
    },
    {
      "id_loinc": "loinc-uuid-2"
    }
  ]
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id_pelayanan` | string | ✅ | ID pelayanan dari SIMRS |
| `subject.patient_name` | string | ✅ | Nama lengkap pasien |
| `subject.patient_mrn` | string | ✅ | Medical Record Number |
| `subject.patient_birth_date` | string | ✅ | Tanggal lahir (YYYY-MM-DD) |
| `subject.patient_age` | number | ✅ | Usia pasien (tahun) |
| `subject.patient_gender` | string | ✅ | Gender: MALE/FEMALE/OTHER |
| `subject.ihs_id` | string | ❌ | IHS Number Satu Sehat (optional) |
| `encounter.encounter_id` | string | ❌ | Encounter ID dari Satu Sehat |
| `requester.id_practitioner` | string | ✅ | IHS Number dokter pengirim |
| `requester.name_practitioner` | string | ✅ | Nama dokter pengirim |
| `diagnosa.code` | string | ❌ | Kode ICD-10 diagnosis |
| `diagnosa.display` | string | ❌ | Nama diagnosis |
| `order_priority` | string | ❌ | ROUTINE/URGENT/ASAP/STAT (default: ROUTINE) |
| `notes` | string | ❌ | Catatan tambahan |
| `details[].id_loinc` | string | ✅ | ID LOINC pemeriksaan (min. 1) |

**Response Success (201 Created):**
```json
{
  "content": {
    "data": {
      "id_order": "550e8400-e29b-41d4-a716-446655440000",
      "detail_orders": [
        {
          "id_detail_order": "detail-uuid-1",
          "accession_number": "OT20250109001"
        },
        {
          "id_detail_order": "detail-uuid-2",
          "accession_number": "OT20250109002"
        }
      ]
    }
  },
  "message": "Order created successfully",
  "errors": []
}
```

**Important Notes:**
- Setiap `detail` akan mendapatkan ACSN unik
- ACSN format: `{MODALITY_CODE}{YYYYMMDD}{SEQ}` (default: OT untuk Other)
- Status awal order detail: `IN_REQUEST`
- Modality dan AE Title akan di-set oleh RIS nanti

**Response Error (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "issues": [
      {
        "path": ["details"],
        "message": "Array must contain at least 1 element(s)"
      }
    ]
  }
}
```

**Response Error (404 Not Found):**
```json
{
  "status": false,
  "message": "Invalid LOINC IDs: loinc-invalid-id. Please use valid LOINC IDs from master data."
}
```

---

### 2.  Get Order by ID

**Endpoint:** `GET /api/orders/{id}`

**Permission Required:** `read:order`

**Description:**
Mendapatkan detail order berdasarkan Order ID.

**Path Parameters:**
- `id` (string, required): Order UUID

**Example Request:**
```bash
GET /api/orders/550e8400-e29b-41d4-a716-446655440000
```

**Response Success (200 OK):**
Same structure as Create Order response, with complete order details.

---

### 3. 🔍 Get Order by Accession Number

**Endpoint:** `GET /api/orders/by-accession/{accessionNumber}`

**Permission Required:** `read:order`

**Description:**
Mendapatkan order berdasarkan Accession Number (ACSN). Berguna untuk tracking order dari hasil pemeriksaan.

**Path Parameters:**
- `accessionNumber` (string, required): Accession Number

**Example Request:**
```bash
GET /api/orders/by-accession/OT20250109001
```

**Response Success (200 OK):**
Same structure as Get Order by ID.

**Response Error (404 Not Found):**
```json
{
  "status": false,
  "message": "Order with this accession number not found"
}
```

---

### 4. 📋 Get All LOINC Codes

**Endpoint:** `GET /api/loinc`

**Permission Required:** `read:loinc`

**Description:**
Mendapatkan daftar master data LOINC (pemeriksaan radiologi) dengan pagination dan search. Endpoint ini digunakan untuk menampilkan daftar pemeriksaan yang tersedia untuk di-order.

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Nomor halaman (default: 1) | `1` |
| `per_page` | number | Items per page (max: 100, default: 10) | `20` |
| `search` | string | Search by name, code, loinc_code, or loinc_display | `thorax` |
| `id_modality` | string | Filter by modality UUID | `modality-uuid` |
| `sort` | string | Sort field: code, name, loinc_code, created_at | `name` |
| `dir` | string | Sort direction: asc, desc | `asc` |

**Example Request:**
```bash
GET /api/loinc?page=1&per_page=20&search=thorax&sort=name&dir=asc
```

**Response Success (200 OK):**
```json
{
  "content": {
    "data": [
      {
        "id": "loinc-uuid-1",
        "id_modality": "modality-uuid-dx",
        "modality": {
          "id": "modality-uuid-dx",
          "code": "DX",
          "name": "Digital Radiography",
          "aet": ["DX_ROOM_1", "DX_ROOM_2"]
        },
        "code": "THORAX-AP",
        "name": "Thorax AP",
        "loinc_code": "24627-2",
        "loinc_display": "Chest X-ray",
        "loinc_system": "http://loinc.org",
        "require_fasting": false,
        "require_pregnancy_check": false,
        "require_use_contrast": false,
        "contrast_name": null,
        "contrast_kfa_code": null,
        "is_active": true,
        "created_at": "2025-01-09T10:00:00Z",
        "updated_at": "2025-01-09T10:00:00Z"
      },
      {
        "id": "loinc-uuid-2",
        "id_modality": "modality-uuid-ct",
        "modality": {
          "id": "modality-uuid-ct",
          "code": "CT",
          "name": "Computed Tomography",
          "aet": ["CT_SCANNER_1"]
        },
        "code": "CT-THORAX",
        "name": "CT Thorax with Contrast",
        "loinc_code": "30745-4",
        "loinc_display": "CT Chest with contrast",
        "loinc_system": "http://loinc.org",
        "require_fasting": true,
        "require_pregnancy_check": true,
        "require_use_contrast": true,
        "contrast_name": "Iohexol injeksi 350 mg/ml (IV)",
        "contrast_kfa_code": "92003638",
        "is_active": true,
        "created_at": "2025-01-09T10:00:00Z",
        "updated_at": "2025-01-09T10:00:00Z"
      }
    ],
    "message": "Successfully fetched all LOINC codes!",
    "code": 200,
    "meta": {
      "total": 150,
      "page": 1,
      "per_page": 20,
      "total_pages": 8,
      "has_next_page": true,
      "has_prev_page": false
    }
  },
  "message": "Successfully fetched all LOINC codes!",
  "errors": []
}
```

**Response Error (401 Unauthorized):**
```json
{
  "message": "Not authenticated"
}
```

**Response Error (403 Forbidden):**
```json
{
  "message": "Permission denied"
}
```

**Use Case:**
- Menampilkan list pemeriksaan radiologi di form order SIMRS
- Auto-complete search saat input pemeriksaan
- Filter pemeriksaan berdasarkan modalitas (CT, MR, DX, dll)
- Validasi `id_loinc` sebelum create order (optional)

---

## Complete Flow Examples

### Flow 1: Complete Order Creation & Monitoring

```bash
# Step 1: SIMRS membuat order baru
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "id_pelayanan": "PELAYANAN-2025-001",
  "subject": {
    "patient_name": "John Doe",
    "patient_mrn": "MRN123456",
    "patient_birth_date": "1990-05-15",
    "patient_age": 35,
    "patient_gender": "MALE",
    "ihs_id": "P02478375538"
  },
  "encounter": {
    "encounter_id": "e47e5146-a6cf-4994-b0d3-873a4e2f4a8c"
  },
  "requester": {
    "id_practitioner": "N10000001",
    "name_practitioner": "dr. Jane Smith, Sp.PD"
  },
  "diagnosa": {
    "code": "A15.0",
    "display": "Tuberculosis of lung"
  },
  "order_priority": "URGENT",
  "notes": "Patient complains of persistent cough for 3 weeks",
  "details": [
    {
      "id_loinc": "loinc-uuid-thorax"
    }
  ]
}

# Response:
{
  "content": {
    "data": {
      "id_order": "550e8400-e29b-41d4-a716-446655440000",
      "detail_orders": [
        {
          "id_detail_order": "detail-uuid-1",
          "accession_number": "OT20250109001"
        }
      ]
    }
  },
  "message": "Order created successfully",
  "errors": []
}

# Step 2: SIMRS monitoring status order by ID
GET /api/orders/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>

# Step 3: SIMRS tracking by ACSN (dari hasil pemeriksaan)
GET /api/orders/by-accession/OT20250109001
Authorization: Bearer <token>
```

### Flow 2: Bulk Order Creation (Multiple Exams)

```bash
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "id_pelayanan": "PELAYANAN-2025-002",
  "subject": {
    "patient_name": "Jane Doe",
    "patient_mrn": "MRN789012",
    "patient_birth_date": "1985-08-20",
    "patient_age": 40,
    "patient_gender": "FEMALE",
    "ihs_id": "P02478375539"
  },
  "encounter": {
    "encounter_id": "encounter-uuid-2"
  },
  "requester": {
    "id_practitioner": "N10000001",
    "name_practitioner": "dr. Jane Smith, Sp.PD"
  },
  "diagnosa": {
    "code": "R91.8",
    "display": "Other nonspecific abnormal finding of lung field"
  },
  "order_priority": "ROUTINE",
  "notes": "Follow-up examination",
  "details": [
    {
      "id_loinc": "loinc-uuid-thorax"
    },
    {
      "id_loinc": "loinc-uuid-ct-chest"
    },
    {
      "id_loinc": "loinc-uuid-abdomen"
    }
  ]
}

# Response: 3 detail orders dengan ACSN berbeda
{
  "content": {
    "data": {
      "id_order": "order-uuid-2",
      "detail_orders": [
        {
          "id_detail_order": "detail-uuid-1",
          "accession_number": "OT20250109002"
        },
        {
          "id_detail_order": "detail-uuid-2",
          "accession_number": "OT20250109003"
        },
        {
          "id_detail_order": "detail-uuid-3",
          "accession_number": "OT20250109004"
        }
      ]
    }
  },
  "message": "Order created successfully",
  "errors": []
}
```



## Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "message": "Not authenticated"
}
```

**Cause:** Missing or invalid JWT token

**Solution:** Login ulang untuk mendapatkan token baru

---

#### 403 Forbidden
```json
{
  "message": "Permission denied"
}
```

**Cause:** User tidak memiliki permission yang diperlukan

**Solution:** Hubungi admin untuk menambahkan permission

---

#### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "issues": [
      {
        "path": ["subject", "patient_mrn"],
        "message": "Required"
      }
    ]
  }
}
```

**Cause:** Data request tidak sesuai schema

**Solution:** Periksa format request body sesuai dokumentasi

---

#### 404 Not Found
```json
{
  "status": false,
  "message": "Order not found"
}
```

**Cause:** Resource tidak ditemukan

**Solution:** Periksa ID atau ACSN yang digunakan

---

#### 500 Internal Server Error
```json
{
  "message": "Failed to create order"
}
```

**Cause:** Error di server

**Solution:** Hubungi tim support RIS

---

## Status Codes

### Order Status Flow

```
IN_REQUEST → IN_QUEUE → IN_PROGRESS → FINAL
```

| Status | Description | Ditetapkan Oleh |
|--------|-------------|-----------------|
| `IN_REQUEST` | Order baru dibuat, menunggu assignment | SIMRS (auto) |
| `IN_QUEUE` | Sudah di-assign modality & radiolog, siap pemeriksaan | RIS |
| `IN_PROGRESS` | Pemeriksaan sedang berlangsung | RIS |
| `FINAL` | Pemeriksaan selesai, hasil sudah tersedia | RIS |

### Priority Levels

| Priority | Description | Use Case |
|----------|-------------|----------|
| `ROUTINE` | Pemeriksaan normal | Pemeriksaan rutin, tidak urgent |
| `URGENT` | Perlu segera dikerjakan | Pasien kondisi serius |
| `ASAP` | As Soon As Possible | Kondisi kritis |
| `STAT` | Immediately | Emergency, life-threatening |

### Order Source

| Source | Description |
|--------|-------------|
| `INTERNAL` | Order dibuat langsung di RIS |
| `EXTERNAL` | Order dari SIMRS/sistem eksternal |

---

## Additional Information

### LOINC Master Data

Untuk mendapatkan daftar LOINC yang tersedia, silakan menghubungi tim RIS untuk mendapatkan master data LOINC yang akan digunakan dalam sistem SIMRS.

**Note:** SIMRS hanya perlu menyimpan `id_loinc` (UUID) untuk setiap pemeriksaan radiologi. Validasi LOINC ID akan dilakukan oleh RIS saat create order.

### Modality Master Data

Modality (jenis perangkat radiologi) akan di-assign oleh RIS setelah order dibuat. SIMRS **tidak perlu** mengirimkan informasi modality saat create order.

**Modality yang tersedia di RIS:**
- **CT** - Computed Tomography
- **MR** - Magnetic Resonance
- **DX** - Digital Radiography
- **CR** - Computed Radiography
- **US** - Ultrasound
- **MG** - Mammography
- **NM** - Nuclear Medicine
- **PT** - Positron Emission Tomography
- **XA** - X-Ray Angiography
- **RF** - Radiofluoroscopy
- **OT** - Other

**Flow:**
1. SIMRS create order dengan LOINC ID → modality = null
2. RIS staff assign modality & AE Title
3. RIS push ke MWL (Modality Worklist)
4. Pemeriksaan dilakukan
5. Hasil tersedia dengan modality info lengkap

### Practitioner/Dokter Pengirim

Untuk dokter pengirim (requester), SIMRS cukup mengirimkan:
- `id_practitioner`: IHS Number dokter dari Satu Sehat
- `name_practitioner`: Nama lengkap dokter

RIS akan otomatis membuat data practitioner baru jika IHS Number belum terdaftar di sistem RIS.

**Tidak perlu melakukan validasi practitioner sebelum create order.**



## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-01-09 | 1.0.0 | Initial documentation for SIMRS integration |

---

**Last Updated:** January 9, 2025  
