# Postman: Send Order to Satu Sehat & Push MWL

Dokumentasi lengkap untuk endpoint `/api/orders/{id}/details/{detailId}/send-to-satusehat` yang:
1. Update detail order dengan data lengkap
2. Build ServiceRequest FHIR 
3. POST ke Satu Sehat API
4. Simpan ServiceRequest ID
5. Push ke MWL (Modality Worklist)

## Endpoint Info

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **URL** | `{{base_url}}/api/orders/{id}/details/{detailId}/send-to-satusehat` |
| **Auth** | Bearer Token (Required) |
| **Permission** | `order:update` |

## URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | ✅ | Order ID |
| `detailId` | UUID | ✅ | Detail Order ID (setiap detail mewakili 1 pemeriksaan) |

## Request Body

```json
{
    "modality_code": "CT",
    "ae_title": "CT_SCANNER_01",
    "performer_id": "10009880728",
    "performer_name": "dr. Budi Santoso, Sp.Rad",
    "contrast_code": "91000367",
    "contrast_name": "Iohexol (Omnipaque 350) Injection 350 mg/mL/100 mL",
    "observation_id": "obs-xxx-xxx",
    "procedure_id": "proc-xxx-xxx",
    "allergy_intolerance_id": "allergy-xxx-xxx",
    "mwl_target": "dcm4chee"
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `modality_code` | string | ✅ | Kode modalitas (CT, MR, CR, DX, US, etc.) |
| `ae_title` | string | ✅ | Application Entity Title perangkat DICOM |
| `performer_id` | string | ✅ | ID Satu Sehat Practitioner (radiolog) |
| `performer_name` | string | ✅ | Nama radiolog yang akan melakukan pemeriksaan |
| `contrast_code` | string | ❌ | Kode KFA untuk kontras media |
| `contrast_name` | string | ❌ | Nama kontras media (dari KFA) |
| `observation_id` | string | ❌ | ID Observation Satu Sehat (supporting info) |
| `procedure_id` | string | ❌ | ID Procedure Satu Sehat (supporting info) |
| `allergy_intolerance_id` | string | ❌ | ID AllergyIntolerance Satu Sehat |
| `mwl_target` | enum | ❌ | Target MWL: `orthanc`, `dcm4chee`, atau `both`. Default: `dcm4chee` |

## Response

### Success (200 OK)

```json
{
    "success": true,
    "message": "Order sent to Satu Sehat and pushed to MWL successfully",
    "data": {
        "detail_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "accession_number": "ACC20251224001",
        "service_request_id": "2d4c8f1e-9b3a-4e5d-8c7f-6a5b4c3d2e1f",
        "mwl_push": {
            "success": true,
            "target": "dcm4chee"
        }
    }
}
```

### Error Responses

**400 Bad Request** - Data tidak valid atau field required tidak ada:
```json
{
    "success": false,
    "message": "Missing accession number"
}
```

**401 Unauthorized** - Token tidak valid:
```json
{
    "success": false,
    "message": "Not authenticated"
}
```

**403 Forbidden** - User tidak punya permission:
```json
{
    "success": false,
    "message": "Permission denied"
}
```

**404 Not Found** - Order atau Detail tidak ditemukan:
```json
{
    "success": false,
    "message": "Order detail not found"
}
```

**500 Internal Server Error** - Gagal komunikasi ke Satu Sehat:
```json
{
    "success": false,
    "message": "Failed to send to Satu Sehat"
}
```

## Contoh Penggunaan di Postman

### 1. Setup Environment Variables

```
{{base_url}} = http://localhost:3000
{{token}} = eyJhbGciOiJI...
```

### 2. Request Headers

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer {{token}}` |

### 3. Contoh Request - CT Scan dengan Kontras

**URL:**
```
POST {{base_url}}/api/orders/123e4567-e89b-12d3-a456-426614174000/details/987fcdeb-51a2-3b4c-d5e6-f78901234567/send-to-satusehat
```

**Body:**
```json
{
    "modality_code": "CT",
    "ae_title": "CT_SCANNER_SIEMENS",
    "performer_id": "10009880728",
    "performer_name": "dr. Ahmad Radiologi, Sp.Rad(K)",
    "contrast_code": "91000367",
    "contrast_name": "Iohexol (Omnipaque 350)",
    "mwl_target": "dcm4chee"
}
```

### 4. Contoh Request - MRI tanpa Kontras

**Body:**
```json
{
    "modality_code": "MR",
    "ae_title": "MRI_GE_3T",
    "performer_id": "10009880729",
    "performer_name": "dr. Siti Radiologi, Sp.Rad",
    "mwl_target": "orthanc"
}
```

### 5. Contoh Request - X-Ray dengan Supporting Info

**Body:**
```json
{
    "modality_code": "CR",
    "ae_title": "CR_PHILIPS_01",
    "performer_id": "10009880730",
    "performer_name": "dr. Budi Santoso, Sp.Rad",
    "observation_id": "550e8400-e29b-41d4-a716-446655440000",
    "procedure_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "allergy_intolerance_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "mwl_target": "both"
}
```

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    POST /send-to-satusehat                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: Update Detail Order                                        │
│  - modality_code, ae_title                                          │
│  - performer_id, performer_name                                     │
│  - contrast (optional)                                              │
│  - supporting info IDs (optional)                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: Build ServiceRequest FHIR                                  │
│  - identifier: accession number                                     │
│  - code: LOINC + KPTL                                               │
│  - orderDetail: modality, AE title, contrast (array)                │
│  - subject: Patient reference                                       │
│  - encounter: Encounter reference                                   │
│  - requester: Practitioner (dokter pengirim)                        │
│  - performer: Practitioner (radiolog)                               │
│  - reasonCode: Diagnosis ICD-10 (array)                             │
│  - supportingInfo: Observation, Procedure, Allergy (array)          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: POST ke Satu Sehat API                                     │
│  POST https://api-satusehat.kemkes.go.id/fhir-r4/v1/ServiceRequest  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: Simpan ServiceRequest ID                                   │
│  - Update detail_order.id_service_request_ss                        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: Push ke MWL                                                │
│  - Orthanc: HTTP POST /modalities/{aet}/worklist                    │
│  - DCM4CHEE: DICOM C-STORE (MWL SCP)                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  RESPONSE: service_request_id + mwl_push status                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Kode Modalitas Umum

| Code | Description |
|------|-------------|
| `CT` | Computed Tomography |
| `MR` | Magnetic Resonance |
| `CR` | Computed Radiography |
| `DX` | Digital Radiography |
| `US` | Ultrasound |
| `NM` | Nuclear Medicine |
| `PT` | PET (Positron Emission Tomography) |
| `MG` | Mammography |
| `RF` | Fluoroscopy |
| `XA` | X-Ray Angiography |

## Contoh Kode Kontras KFA

| Kode KFA | Nama |
|----------|------|
| `91000367` | Iohexol (Omnipaque 350) Injection 350 mg/mL/100 mL |
| `91000368` | Iohexol (Omnipaque 300) Injection 300 mg/mL/100 mL |
| `91000369` | Iopromide (Ultravist 370) Injection 370 mg/mL/100 mL |
| `91000370` | Iopamidol (Iopamiro 300) Injection 300 mg/mL/100 mL |
| `91000371` | Gadopentetate Dimeglumine (Magnevist) Injection 469 mg/mL/15 mL |

## Catatan Penting

1. **Data harus lengkap** - Sebelum memanggil endpoint ini, pastikan data order dari SIMRS sudah lengkap (patient, encounter, LOINC code, diagnosis)

2. **Performer adalah Radiolog** - `performer_id` dan `performer_name` adalah radiolog yang akan melakukan pemeriksaan, bukan dokter pengirim

3. **MWL Target**:
   - `orthanc`: Push ke Orthanc PACS
   - `dcm4chee`: Push ke DCM4CHEE PACS
   - `both`: Push ke kedua sistem

4. **ServiceRequest ID** - Setelah berhasil, simpan `service_request_id` untuk referensi di Satu Sehat

5. **Idempotent** - Jika dipanggil ulang untuk detail yang sama, akan membuat ServiceRequest baru (bukan update)

## Troubleshooting

| Error | Penyebab | Solusi |
|-------|----------|--------|
| "Missing accession number" | Order detail belum punya accession number | Pastikan order sudah di-create dengan benar |
| "Missing schedule date" | Tanggal pemeriksaan belum diset | Update schedule_date atau occurrence_datetime |
| "Missing patient or encounter reference" | Data dari SIMRS tidak lengkap | Cek service_request_json di order detail |
| "Failed to send to Satu Sehat" | Error komunikasi ke API Satu Sehat | Cek token Satu Sehat dan koneksi internet |
| MWL push failed | Konfigurasi MWL tidak benar | Cek environment variable untuk Orthanc/DCM4CHEE |
