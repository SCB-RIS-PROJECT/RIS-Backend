# Diagnosis API Usage Guide

## Overview
Diagnosis data sekarang disimpan dalam dua kolom terpisah di database:
- `diagnosis_code`: Kode diagnosis (contoh: "J18.9")
- `diagnosis_display`: Deskripsi diagnosis (contoh: "Pneumonia, unspecified organism")

## 1. Create Order dari SIMRS

### Endpoint
```
POST /api/orders/simrs
```

### Request Body Format
```json
{
  "id_pelayanan": "PEL-20251229-0001",
  "details": [
    {
      "ccurence_date_time": "2025-12-29T10:00:00Z",
      "order_priority": "ROUTINE",
      "notes": "Pasien batuk sejak 3 hari yang lalu",
      "pemeriksaan": {
        "system": "http://loinc.org",
        "code": "36687-2",
        "display": "Thorax X-Ray",
        "text": "Foto thorax PA"
      },
      "subject": {
        "ihs_id": "P123456789",
        "patient_name": "John Doe",
        "patient_mrn": "MRN001",
        "patient_birth_date": "1990-01-01",
        "patient_age": 35,
        "patient_gender": "MALE"
      },
      "encounter": {
        "encounter_id": "ENC-123456"
      },
      "requester": {
        "id_practitioner": "PRACT-001",
        "name_practitioner": "Dr. Jane Smith"
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

### Yang Terjadi di Backend
Ketika data diterima, sistem akan:
1. Menyimpan `diagnosis_code = "J18.9"`
2. Menyimpan `diagnosis_display = "Pneumonia, unspecified organism"`
3. Menyimpan `diagnosis = "J18.9 - Pneumonia, unspecified organism"` (backup)
4. Menyimpan `reason_code = "J18.9"` dan `reason_display = "Pneumonia, unspecified organism"`

### Response
```json
{
  "success": true,
  "message": "Order created successfully"
}
```

---

## 2. Update Order Detail dari RIS

### Endpoint
```
PATCH /api/orders/{orderId}/details/{detailId}
```

### Request Body Format

#### Update Diagnosis
```json
{
  "diagnosis": {
    "code": "J18.0",
    "display": "Bronchopneumonia, unspecified organism"
  }
}
```

#### Update Diagnosis + Status + Notes
```json
{
  "order_status": "IN_PROGRESS",
  "diagnosis": {
    "code": "J18.0",
    "display": "Bronchopneumonia, unspecified organism"
  },
  "notes": "Pemeriksaan selesai, hasil menunjukkan infiltrat di lobus kanan bawah"
}
```

#### Update Hanya Status (tanpa mengubah diagnosis)
```json
{
  "order_status": "COMPLETED"
}
```

#### Update Schedule dan Priority
```json
{
  "schedule_date": "2025-12-30T14:00:00Z",
  "order_priority": "URGENT",
  "notes": "Pasien kondisi memburuk, prioritas dinaikkan"
}
```

### Response
```json
{
  "id": "uuid-detail-id",
  "accession_number": "CT20251229001",
  "order_number": "ORD-CT20251229001",
  "schedule_date": "2025-12-29T10:00:00Z",
  "order_priority": "ROUTINE",
  "order_status": "IN_PROGRESS",
  "diagnosis": {
    "code": "J18.0",
    "display": "Bronchopneumonia, unspecified organism"
  },
  "notes": "Pemeriksaan selesai, hasil menunjukkan infiltrat di lobus kanan bawah",
  "exam": {
    "id": "uuid-exam-id",
    "code": "36687-2",
    "name": "Thorax X-Ray",
    "loinc_code": "36687-2",
    "loinc_display": "Thorax X-Ray",
    "require_fasting": false,
    "require_pregnancy_check": false,
    "require_use_contrast": false,
    "contrast_name": null
  },
  "modality": {
    "id": "uuid-modality-id",
    "code": "CT",
    "name": "Computed Tomography"
  },
  "satu_sehat": {
    "id_service_request": "SR-123456",
    "id_observation": null,
    "id_procedure": null
  },
  "created_at": "2025-12-29T08:00:00Z",
  "updated_at": "2025-12-29T10:30:00Z"
}
```

---

## 3. Contoh Use Case

### Use Case 1: SIMRS Membuat Order Baru
SIMRS mengirim order dengan diagnosis awal dari dokter yang merujuk:

```bash
curl -X POST http://localhost:3000/api/orders/simrs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "id_pelayanan": "PEL-20251229-0001",
    "details": [{
      "pemeriksaan": {
        "system": "http://loinc.org",
        "code": "36687-2",
        "display": "Thorax X-Ray"
      },
      "subject": {
        "ihs_id": "P123456789",
        "patient_name": "John Doe",
        "patient_mrn": "MRN001",
        "patient_birth_date": "1990-01-01",
        "patient_age": 35,
        "patient_gender": "MALE"
      },
      "encounter": {
        "encounter_id": "ENC-123456"
      },
      "requester": {
        "id_practitioner": "PRACT-001",
        "name_practitioner": "Dr. Jane Smith"
      },
      "diagnosa": {
        "system": "http://hl7.org/fhir/sid/icd-10",
        "code": "J18.9",
        "display": "Pneumonia, unspecified organism"
      }
    }]
  }'
```

### Use Case 2: Radiolog Mengupdate Diagnosis Setelah Baca Hasil
Radiolog melihat hasil dan mengupdate diagnosis yang lebih spesifik:

```bash
curl -X PATCH http://localhost:3000/api/orders/ORDER_UUID/details/DETAIL_UUID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "diagnosis": {
      "code": "J18.0",
      "display": "Bronchopneumonia, unspecified organism"
    },
    "order_status": "COMPLETED",
    "notes": "Hasil foto thorax PA: tampak infiltrat pada lobus kanan bawah, konsisten dengan bronchopneumonia"
  }'
```

### Use Case 3: RIS Admin Mengoreksi Diagnosis
Admin RIS memperbaiki diagnosis yang salah input:

```bash
curl -X PATCH http://localhost:3000/api/orders/ORDER_UUID/details/DETAIL_UUID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "diagnosis": {
      "code": "J18.1",
      "display": "Lobar pneumonia, unspecified organism"
    }
  }'
```

### Use Case 4: Clear/Hapus Diagnosis
Menghapus diagnosis (set null):

```bash
curl -X PATCH http://localhost:3000/api/orders/ORDER_UUID/details/DETAIL_UUID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "diagnosis": {
      "code": null,
      "display": null
    }
  }'
```

---

## 4. Validasi dan Error Handling

### Schema Validation
- `diagnosis.code`: Optional string
- `diagnosis.display`: Optional string
- Kedua field bisa null atau tidak diisi
- Jika ingin update diagnosis, kirim object dengan kedua field (code dan display)

### Contoh Error Response
```json
{
  "success": false,
  "error": {
    "issues": [
      {
        "code": "invalid_type",
        "path": ["diagnosis"],
        "message": "Expected object, received string"
      }
    ]
  }
}
```

---

## 5. Database Structure

### Table: `tb_detail_order`

| Column | Type | Description |
|--------|------|-------------|
| `diagnosis` | TEXT | Legacy field (backup) - format: "CODE - Display" |
| `diagnosis_code` | VARCHAR(50) | Kode diagnosis (e.g., "J18.9") |
| `diagnosis_display` | VARCHAR(255) | Deskripsi diagnosis |
| `reason_code` | VARCHAR(50) | Reason code (duplicate dari diagnosis_code) |
| `reason_display` | VARCHAR(255) | Reason display (duplicate dari diagnosis_display) |

### Indexes
- `detail_order_diagnosis_code_idx` on `diagnosis_code`

---

## 6. Migration Notes

Data lama yang sudah ada telah di-migrate dengan pattern:
- Input: `"J18.9 - Pneumonia, unspecified organism"`
- Output:
  - `diagnosis_code`: `"J18.9"`
  - `diagnosis_display`: `"Pneumonia, unspecified organism"`

Pattern yang didukung:
1. `"CODE - Display"` → split by `-`
2. `"CODE: Display"` → split by `:`
3. `"CODE"` → code only, display = null
4. `"Display"` → display only (no code pattern), code = null
