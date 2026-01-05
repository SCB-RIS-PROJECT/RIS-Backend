# NEW ORDER FLOW - RIS BACKEND

## Perubahan Proses Bisnis

### Sebelumnya (OLD):
- SIMRS → RIS: Kirim order dengan detail per pemeriksaan
- RIS: Generate ACSN per detail, simpan data, **kirim ke SatuSehat**
- RIS: Push ke MWL
- SIMRS: Get order by ID untuk mendapatkan informasi

### Sekarang (NEW):
- SIMRS → RIS: Kirim order dengan array pemeriksaan (LOINC codes)
- RIS: Generate ACSN per pemeriksaan, simpan data
- RIS: **TIDAK kirim ke SatuSehat** (handled by SIMRS)
- RIS: Push ke MWL
- SIMRS: Get order by ID, **SIMRS yang handle integrasi SatuSehat**

## Request Format Baru

### Endpoint: `POST /api/orders`

```json
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

## Response Format Baru

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

## Schema Penyimpanan

### 1. Table: `tb_order`
Menyimpan informasi header order:
- `id`: UUID order (primary key)
- `id_pelayanan`: Service ID dari SIMRS
- `id_encounter_ss`: Encounter ID dari SatuSehat
- `patient_name`, `patient_mrn`, `patient_birth_date`, `patient_age`, `patient_gender`: Data pasien
- `id_created_by`: User yang membuat order
- `created_at`, `updated_at`: Timestamp

**1 Order = 1 Pelayanan dari SIMRS**

### 2. Table: `tb_detail_order`
Menyimpan detail pemeriksaan per LOINC code:
- `id`: UUID detail order (primary key)
- `id_order`: FK ke `tb_order`
- `id_loinc`: FK ke `tb_loinc` (jika LOINC code ditemukan di master data)
- `accession_number`: ACSN yang di-generate (format: `{MODALITY_CODE}{YYYYMMDD}{SEQ}`)
- `order_number`: Order number (format: `ORD-{ACSN}`)
- `loinc_code_alt`: LOINC code dari SIMRS (disimpan sebagai alternatif)
- `loinc_display_alt`: Display name LOINC dari SIMRS
- `code_text`: Text description pemeriksaan
- `modality_code`: Kode modalitas (didapat dari relasi LOINC → Modality)
- `order_priority`: Prioritas order (ROUTINE, URGENT, ASAP, STAT)
- `order_status`: Status order (IN_REQUEST, IN_QUEUE, IN_PROGRESS, FINAL)
- `diagnosis`, `diagnosis_code`, `diagnosis_display`: Informasi diagnosis ICD-10
- `notes`: Catatan tambahan
- `id_requester_ss`, `requester_display`: Info dokter pengirim (disimpan untuk referensi, tidak untuk kirim SatuSehat)

**Relasi LOINC:**
- **LOINC 1 : Many ORDER DETAIL**
- Jika LOINC code dari SIMRS ditemukan di `tb_loinc`, maka `id_loinc` akan diisi
- Jika tidak ditemukan, `id_loinc` = NULL, tapi `loinc_code_alt` dan `loinc_display_alt` tetap disimpan

### 3. Table: `tb_loinc`
Master data LOINC yang sudah dikonfigurasi:
- `id`: UUID LOINC (primary key)
- `id_modality`: FK ke `tb_modality` (relasi ke modalitas)
- `code`: Internal code RIS
- `loinc_code`: Kode LOINC standar
- `loinc_display`: Display name LOINC
- `loinc_system`: System URL (default: http://loinc.org)
- `require_fasting`, `require_pregnancy_check`, `require_use_contrast`: Requirement flags
- `contrast_name`, `contrast_kfa_code`: Info kontras jika diperlukan

**Relasi:**
- LOINC → Modality (Many to One)
- LOINC → Detail Order (One to Many)

## Alur Proses Create Order

```
1. SIMRS kirim POST /api/orders dengan format baru
   ↓
2. RIS: Extract info patient, encounter, diagnosis
   ↓
3. RIS: Create record di tb_order (1 order)
   ↓
4. RIS: Loop setiap detail (LOINC code):
   a. Cari LOINC di tb_loinc berdasarkan loinc_code
   b. Jika ketemu: 
      - Ambil id_loinc dan modality_code dari relasi
   c. Jika tidak ketemu:
      - id_loinc = NULL
      - modality_code = "OT" (Other)
   d. Generate ACSN: {MODALITY_CODE}{YYYYMMDD}{SEQ}
   e. Create record di tb_detail_order
   ↓
5. RIS: Return response dengan id_order dan array detail_orders (id + acsn)
   ↓
6. SIMRS: Simpan id_order dan mapping ACSN
   ↓
7. SIMRS: Ketika order lengkap dan push ke MWL, panggil GET /api/orders/{id}
   ↓
8. SIMRS: Handle integrasi SatuSehat (ServiceRequest, Observation, etc.)
```

## Generate ACSN Logic

Format: `{MODALITY_CODE}{YYYYMMDD}{SEQ}`

Contoh:
- `DX20250105001` → Modality DX, tanggal 2025-01-05, sequence 001
- `CT20250105002` → Modality CT, tanggal 2025-01-05, sequence 002
- `OT20250105003` → Modality Other (tidak ketemu LOINC), tanggal 2025-01-05, sequence 003

Modality code didapat dari:
1. Cari LOINC di `tb_loinc` berdasarkan `loinc_code`
2. Jika ketemu, ambil `id_modality` → join ke `tb_modality` → ambil `code`
3. Jika tidak ketemu, gunakan "OT" (Other)

Sequence:
- Sequence per hari, mulai dari 001
- Auto-increment berdasarkan count ACSN dengan prefix yang sama di hari yang sama

## Endpoints yang Dihapus (SatuSehat Related)

❌ `POST /api/orders/{id}/details/{detailId}/send-to-satusehat`
- Tidak diperlukan lagi, SIMRS yang handle

❌ `POST /api/orders/fetch-imaging-study/:accessionNumber`
- Tidak diperlukan lagi, SIMRS yang handle

## Endpoints yang Tetap Ada

✅ `GET /api/orders` - Get all orders with filters
✅ `GET /api/orders/{id}` - Get order by ID (digunakan SIMRS untuk get detail)
✅ `GET /api/orders/by-accession/:accessionNumber` - Get order by ACSN
✅ `POST /api/orders` - Create new order (FORMAT BARU)
✅ `PATCH /api/orders/{id}` - Update order header
✅ `PATCH /api/orders/{id}/details/{detailId}` - Update detail order
✅ `POST /api/orders/{id}/details/{detailId}/push-to-mwl` - Push ke MWL
✅ `POST /api/orders/{id}/push-to-mwl` - Push semua detail ke MWL
✅ `POST /api/orders/{id}/details/{detailId}/finalize` - Finalize order (local only, no SatuSehat)

## Contoh Use Case

### Use Case 1: Create Order dengan 2 Pemeriksaan

**Request:**
```json
POST /api/orders
{
  "id_pelayanan": "PEL-001",
  "subject": { ... },
  "encounter": { ... },
  "requester": { ... },
  "diagnosa": { ... },
  "details": [
    { "code": "36687-2", "display": "XR Chest AP" },
    { "code": "24627-2", "display": "CT Chest" }
  ]
}
```

**Response:**
```json
{
  "content": {
    "data": {
      "id_order": "uuid-order-1",
      "detail_orders": [
        { "id_detail_order": "uuid-detail-1", "accession_number": "DX20250105001" },
        { "id_detail_order": "uuid-detail-2", "accession_number": "CT20250105002" }
      ]
    }
  },
  "message": "Order created successfully",
  "errors": []
}
```

### Use Case 2: SIMRS Get Order Detail untuk Kirim SatuSehat

**Request:**
```
GET /api/orders/uuid-order-1
```

**Response:**
```json
{
  "content": {
    "data": {
      "id": "uuid-order-1",
      "id_pelayanan": "PEL-001",
      "id_encounter_ss": "encounter-uuid",
      "patient": { ... },
      "practitioners": { ... },
      "details": [
        {
          "id": "uuid-detail-1",
          "accession_number": "DX20250105001",
          "exam": { 
            "loinc_code": "36687-2",
            "loinc_display": "XR Chest AP"
          },
          "diagnosis": { ... },
          "notes": "...",
          ...
        },
        {
          "id": "uuid-detail-2",
          "accession_number": "CT20250105002",
          ...
        }
      ]
    }
  },
  "message": "Order retrieved successfully",
  "errors": []
}
```

SIMRS menggunakan data ini untuk:
- Create ServiceRequest di SatuSehat
- Create Observation di SatuSehat
- Create DiagnosticReport di SatuSehat
- dll.

## Migration Notes

Jika ada data lama yang menggunakan format lama:
1. Data lama tetap tersimpan dengan format lama
2. Endpoint GET masih bisa membaca data lama
3. Data baru menggunakan format baru
4. Tidak perlu migrasi data lama, karena schema backward compatible

## Summary

✅ **Simplified**: Request body lebih sederhana, hanya array LOINC codes
✅ **Cleaner**: RIS tidak handle SatuSehat, fokus ke order management dan MWL
✅ **Scalable**: 1 order bisa punya banyak pemeriksaan, masing-masing dapat ACSN sendiri
✅ **Maintainable**: Separation of concern - RIS untuk radiology workflow, SIMRS untuk SatuSehat integration
