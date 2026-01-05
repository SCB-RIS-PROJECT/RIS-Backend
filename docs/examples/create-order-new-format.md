# Example Request untuk Create Order (Format Baru)

## Request

```http
POST /api/orders HTTP/1.1
Host: dev.verd.net.id:8001
Content-Type: application/json
Authorization: Bearer <your_token>

{
  "id_pelayanan": "PEL-1766652792162",
  "subject": {
    "ihs_id": "100000030009",
    "patient_name": "Budi Santoso",
    "patient_mrn": "12345",
    "patient_birth_date": "1933-07-10",
    "patient_age": 92,
    "patient_gender": "MALE"
  },
  "encounter": {
    "encounter_id": "7b73d0ec-c891-404c-99b9-05f90c60372e"
  },
  "requester": {
    "id_practitioner": "N10000001",
    "name_practitioner": "Dokter Bronsig"
  },
  "diagnosa": {
    "system": "http://hl7.org/fhir/sid/icd-10",
    "code": "J18.9",
    "display": "Pneumonia, unspecified organism"
  },
  "order_priority": "ROUTINE",
  "notes": "Pasien tidak puasa",
  "details": [
    {
      "system": "http://loinc.org",
      "code": "36687-2",
      "display": "XR Chest AP and Lateral",
      "text": "Pemeriksaan X-Ray Thorax PA"
    },
    {
      "system": "http://loinc.org",
      "code": "24627-2",
      "display": "CT Chest with contrast",
      "text": "Pemeriksaan CT Scan Thorax dengan kontras"
    }
  ]
}
```

## Response (Success)

```json
{
  "content": {
    "data": {
      "id_order": "550e8400-e29b-41d4-a716-446655440000",
      "detail_orders": [
        {
          "id_detail_order": "660e8400-e29b-41d4-a716-446655440001",
          "accession_number": "DX20250105001"
        },
        {
          "id_detail_order": "660e8400-e29b-41d4-a716-446655440002",
          "accession_number": "CT20250105002"
        }
      ]
    }
  },
  "message": "Order created successfully",
  "errors": []
}
```

## cURL Command

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "id_pelayanan": "PEL-1766652792162",
    "subject": {
      "ihs_id": "100000030009",
      "patient_name": "Budi Santoso",
      "patient_mrn": "12345",
      "patient_birth_date": "1933-07-10",
      "patient_age": 92,
      "patient_gender": "MALE"
    },
    "encounter": {
      "encounter_id": "7b73d0ec-c891-404c-99b9-05f90c60372e"
    },
    "requester": {
      "id_practitioner": "N10000001",
      "name_practitioner": "Dokter Bronsig"
    },
    "diagnosa": {
      "system": "http://hl7.org/fhir/sid/icd-10",
      "code": "J18.9",
      "display": "Pneumonia, unspecified organism"
    },
    "order_priority": "ROUTINE",
    "notes": "Pasien tidak puasa",
    "details": [
      {
        "system": "http://loinc.org",
        "code": "36687-2",
        "display": "XR Chest AP and Lateral",
        "text": "Pemeriksaan X-Ray Thorax PA"
      }
    ]
  }'
```

## Contoh dengan Multiple Pemeriksaan

```json
{
  "id_pelayanan": "PEL-1766652792163",
  "subject": {
    "ihs_id": "100000030010",
    "patient_name": "Siti Nurhaliza",
    "patient_mrn": "67890",
    "patient_birth_date": "1980-05-15",
    "patient_age": 44,
    "patient_gender": "FEMALE"
  },
  "encounter": {
    "encounter_id": "8c84e1fd-d992-515d-b010-16f91d60473f"
  },
  "requester": {
    "id_practitioner": "N10000002",
    "name_practitioner": "Dr. Ahmad Syafiq"
  },
  "diagnosa": {
    "system": "http://hl7.org/fhir/sid/icd-10",
    "code": "M79.3",
    "display": "Panniculitis, unspecified"
  },
  "order_priority": "URGENT",
  "notes": "Urgent case, suspect acute condition",
  "details": [
    {
      "system": "http://loinc.org",
      "code": "30704-1",
      "display": "CT Abdomen and Pelvis",
      "text": "CT Scan Abdomen Pelvis dengan kontras"
    },
    {
      "system": "http://loinc.org",
      "code": "36554-4",
      "display": "US Abdomen",
      "text": "USG Abdomen"
    },
    {
      "system": "http://loinc.org",
      "code": "24558-9",
      "display": "XR Abdomen",
      "text": "X-Ray Abdomen"
    }
  ]
}
```

## Field Explanation

### Required Fields:
- `id_pelayanan`: ID pelayanan dari SIMRS
- `subject`: Data pasien
  - `ihs_id`: IHS ID dari SatuSehat
  - `patient_name`: Nama lengkap pasien
  - `patient_mrn`: Medical Record Number dari SIMRS
  - `patient_birth_date`: Tanggal lahir (format: YYYY-MM-DD)
  - `patient_age`: Umur pasien (dalam tahun)
  - `patient_gender`: Gender ("MALE" atau "FEMALE")
- `encounter`: Data encounter
  - `encounter_id`: ID encounter dari SatuSehat
- `requester`: Data dokter pengirim
  - `id_practitioner`: ID practitioner dari SatuSehat
  - `name_practitioner`: Nama lengkap dokter
- `details`: Array pemeriksaan (minimal 1)
  - `system`: System URL (default: http://loinc.org)
  - `code`: Kode LOINC
  - `display`: Display name LOINC

### Optional Fields:
- `diagnosa`: Diagnosis ICD-10
  - `system`: System URL (default: http://hl7.org/fhir/sid/icd-10)
  - `code`: Kode ICD-10
  - `display`: Display name ICD-10
- `order_priority`: Prioritas order ("ROUTINE", "URGENT", "ASAP", "STAT") - default: "ROUTINE"
- `notes`: Catatan tambahan
- `details[].text`: Deskripsi pemeriksaan (optional)

## Error Responses

### 400 Bad Request - Missing Required Field

```json
{
  "content": {
    "data": null
  },
  "message": "Validation error",
  "errors": [
    {
      "path": ["subject", "ihs_id"],
      "message": "Required"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "content": {
    "data": null
  },
  "message": "Not authenticated",
  "errors": []
}
```

### 403 Forbidden

```json
{
  "content": {
    "data": null
  },
  "message": "Permission denied",
  "errors": []
}
```

## Notes

1. Setiap detail pemeriksaan akan mendapatkan ACSN (Accession Number) yang unik
2. ACSN format: `{MODALITY_CODE}{YYYYMMDD}{SEQ}`
   - Contoh: `DX20250105001` (DX = Digital X-Ray, 2025-01-05, sequence 001)
3. LOINC code akan dicari di master data (`tb_loinc`), jika tidak ditemukan akan tetap tersimpan sebagai `loinc_code_alt`
4. RIS tidak lagi mengirim data ke SatuSehat - ini akan di-handle oleh SIMRS
5. SIMRS dapat menggunakan `id_order` dan `accession_number` yang dikembalikan untuk tracking
