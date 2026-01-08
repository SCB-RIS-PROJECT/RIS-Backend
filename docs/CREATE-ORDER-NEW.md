# Create Order - Format Baru

## Perubahan dari Format Lama

### ❌ Format Lama (Tidak Digunakan Lagi)
Detail order menggunakan LOINC code:
```json
{
  "details": [
    {
      "system": "http://loinc.org",
      "code": "36687-2",
      "display": "XR Chest AP and Lateral",
      "text": "Pemeriksaan X-Ray Thorax PA"
    }
  ]
}
```

### ✅ Format Baru (Yang Digunakan Sekarang)
Detail order hanya menggunakan **ID LOINC (UUID)** dari master data:
```json
{
  "details": [
    {
      "id_loinc": "65db7572-c4f5-41d0-9955-1969f3af9a70"
    }
  ]
}
```

## Endpoint
```
POST /api/orders
```

## Request Body

```json
{
  "id_pelayanan": "PEL-1766652792213",
  "subject": {
    "ihs_id": "100000030009",
    "patient_name": "Muhammad Ghufran",
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
      "id_loinc": "65db7572-c4f5-41d0-9955-1969f3af9a70"
    },
    {
      "id_loinc": "a8f3b2e1-9c4d-4e2f-8a1b-5c7d9e3f2a1b"
    }
  ]
}
```

## Field Descriptions

### Root Level
- `id_pelayanan` (string, required): Service ID dari SIMRS
- `subject` (object, required): Informasi pasien
- `encounter` (object, required): Informasi encounter
- `requester` (object, required): Informasi dokter perujuk
- `diagnosa` (object, optional): Diagnosis ICD-10
- `order_priority` (string, optional): Priority order - "ROUTINE", "URGENT", "ASAP", "STAT". Default: "ROUTINE"
- `notes` (string, optional): Catatan tambahan dari SIMRS
- `details` (array, required): Array of examination details (minimal 1)

### Subject (Patient Info)
- `ihs_id` (string): Satu Sehat Patient IHS ID
- `patient_name` (string): Nama lengkap pasien
- `patient_mrn` (string): MRN pasien dari SIMRS
- `patient_birth_date` (string): Tanggal lahir (YYYY-MM-DD)
- `patient_age` (number): Umur pasien (tahun)
- `patient_gender` (enum): "MALE" atau "FEMALE"

### Encounter
- `encounter_id` (string): Satu Sehat Encounter ID

### Requester (Dokter Perujuk)
- `id_practitioner` (string): Satu Sehat Practitioner ID (IHS Number)
- `name_practitioner` (string): Nama dokter

**Note**: Jika practitioner belum ada di database, akan otomatis dibuat.

### Diagnosa (ICD-10)
- `system` (string): URL sistem ICD-10
- `code` (string): Kode ICD-10
- `display` (string): Deskripsi diagnosis

### Details (Pemeriksaan)
- `id_loinc` (string, UUID): **ID LOINC dari master data RIS**

**⚠️ PENTING**: 
- Harus menggunakan UUID dari tabel `tb_loinc` di RIS
- Gunakan endpoint `GET /api/loinc` untuk mendapatkan list LOINC yang tersedia
- Jika LOINC ID tidak ditemukan, detail akan di-skip dan tidak dibuat

## Response Success

```json
{
  "content": {
    "data": {
      "id_order": "617a5f96-4089-4aee-bb32-02b3262c4c5b",
      "detail_orders": [
        {
          "id_detail_order": "8e38e1a8-3a28-4209-a9cf-fb3bd91a230c",
          "accession_number": "CR20260108001"
        },
        {
          "id_detail_order": "8bae2214-24d4-4400-a467-8776d4c822c8",
          "accession_number": "CT20260108001"
        }
      ]
    }
  },
  "message": "Order created successfully",
  "errors": []
}
```

## Response Error - LOINC Not Found

```json
{
  "content": {
    "data": null
  },
  "message": "Failed to create order",
  "errors": [
    {
      "code": "INVALID_INPUT",
      "message": "One or more LOINC IDs not found in master data"
    }
  ]
}
```

## Cara Mendapatkan ID LOINC

### 1. Get All LOINC
```bash
GET /api/loinc?page=1&per_page=100
```

Response:
```json
{
  "content": {
    "data": [
      {
        "id": "65db7572-c4f5-41d0-9955-1969f3af9a70",
        "code": "RAD-XR-002",
        "name": "Thorax AP/Lat",
        "loinc_code": "36687-2",
        "loinc_display": "XR Chest AP and Lateral",
        "modality": {
          "id": "fd1a962b-6065-4d37-90ea-4f5838644bf8",
          "code": "CR",
          "name": "X-Ray"
        }
      }
    ]
  }
}
```

### 2. Search LOINC by Code
```bash
GET /api/loinc?search=36687-2
```

### 3. Search LOINC by Name
```bash
GET /api/loinc?search=thorax
```

## Data Flow

1. **SIMRS** mengirim request ke RIS dengan `id_loinc` (UUID)
2. **RIS** validasi LOINC ID ada di master data
3. **RIS** ambil data modality dari LOINC
4. **RIS** generate Accession Number berdasarkan modality code
5. **RIS** buat order dan detail order
6. **RIS** otomatis buat practitioner jika belum ada
7. **RIS** return `id_order` dan array `detail_orders` dengan accession number

## Perubahan Requester

### Sebelumnya
- Requester hanya di-lookup, jika tidak ada akan warning
- Requester dan performers ada di level order

### Sekarang
- ✅ Requester otomatis dibuat jika belum ada di database
- ✅ Requester disimpan di level **order** (bukan detail)
- ✅ Response API akan show requester dan performer di **level detail** (bukan order)
- ✅ Requester dari order akan di-copy ke semua detail saat response
- ✅ Performer bisa beda-beda per detail/pemeriksaan

Response struktur:
```json
{
  "id": "617a5f96-4089-4aee-bb32-02b3262c4c5b",
  "patient": { ... },
  "created_by": { ... },
  "details": [
    {
      "id": "8e38e1a8-3a28-4209-a9cf-fb3bd91a230c",
      "accession_number": "CR20260108001",
      "exam": { ... },
      "requester": {
        "id": "uuid",
        "id_ss": "N10000001",
        "name": "Dokter Bronsig"
      },
      "performer": {
        "id": "uuid", 
        "id_ss": "N20000001",
        "name": "Dr. Radiolog A"
      }
    },
    {
      "id": "8bae2214-24d4-4400-a467-8776d4c822c8",
      "accession_number": "CT20260108002",
      "exam": { ... },
      "requester": {
        "id": "uuid",
        "id_ss": "N10000001",
        "name": "Dokter Bronsig"
      },
      "performer": {
        "id": "uuid",
        "id_ss": "N20000002", 
        "name": "Dr. Radiolog B"
      }
    }
  ]
}
```

**Note**: 
- Requester sama untuk semua detail (dari order)
- Performer bisa berbeda per detail (karena bisa dikerjakan radiolog berbeda)

## Example cURL

```bash
curl -X POST http://localhost:8001/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "id_pelayanan": "PEL-1766652792213",
    "subject": {
      "ihs_id": "100000030009",
      "patient_name": "Muhammad Ghufran",
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
        "id_loinc": "65db7572-c4f5-41d0-9955-1969f3af9a70"
      }
    ]
  }'
```

## Migration Guide untuk SIMRS

Jika sebelumnya SIMRS mengirim LOINC code, perlu update logic:

### Sebelum Request
1. Query ke RIS: `GET /api/loinc?search={loinc_code}`
2. Extract `id` dari response
3. Gunakan `id` tersebut di request body `details[].id_loinc`

### Alternatif: Simpan Mapping
SIMRS bisa maintain mapping table:
```
loinc_code -> loinc_id_ris
"36687-2"  -> "65db7572-c4f5-41d0-9955-1969f3af9a70"
```

Sehingga tidak perlu query setiap kali create order.
