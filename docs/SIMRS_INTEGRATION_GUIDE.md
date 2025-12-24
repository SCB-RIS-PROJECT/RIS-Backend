# SIMRS Integration Guide

## Overview

RIS (Radiology Information System) menerima order pemeriksaan radiologi dari SIMRS dan:
1. Generate ACSN (Accession Number) dengan format: `{MODALITY}{YYYYMMDD}{SEQ}`
2. Menyimpan data order ke database
3. **Otomatis** mengirim ServiceRequest ke Satu Sehat (background/async)
4. Mengembalikan response sederhana ke SIMRS

## Flow Diagram

```
SIMRS                    RIS                      Satu Sehat           MWL Server
  |                       |                           |                    |
  |  POST /api/orders/simrs                           |                    |
  |---------------------->|                           |                    |
  |                       |  Generate ACSN            |                    |
  |                       |  Store Order              |                    |
  |                       |                           |                    |
  |  Response (id_order)  |                           |                    |
  |<----------------------|                           |                    |
  |                       |                           |                    |
  |                       |  (async) Send ServiceRequest                   |
  |                       |-------------------------->|                    |
  |                       |  Store ServiceRequest ID  |                    |
  |                       |                           |                    |
  |                       |  (manual) POST /push-to-mwl                    |
  |                       |----------------------------------------->      |
```

## API Endpoint

### Create Order from SIMRS

**Endpoint:** `POST /api/orders/simrs`

**Request Body:**

```json
{
    "id_pelayanan": "PEL-2023-12345",
    "details": [
        {
            "id_loinc": "dbdd786d-a4f5-4fa1-90e1-eccca959c2a7",
            "schedule_date": "2023-12-24T10:00:00Z",
            "order_priority": "ROUTINE",
            "notes": "Pasien tidak puasa",
            "service_request": {
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "36687-2",
                            "display": "XR Chest AP and Lateral"
                        },
                        {
                            "system": "http://terminology.kemkes.go.id/CodeSystem/kptl",
                            "code": "31243.NP001.AP005",
                            "display": "Radiografi Thorax 1 proyeksi"
                        }
                    ],
                    "text": "Pemeriksaan X-Ray Thorax PA"
                },
                "orderDetail": [
                    {
                        "coding": [{ "system": "http://dicom.nema.org/resources/ontology/DCM", "code": "DX" }],
                        "text": "Modality Code: DX"
                    },
                    {
                        "coding": [{ "system": "http://sys-ids.kemkes.go.id/ae-title", "display": "XR0001" }]
                    }
                ],
                "subject": {
                    "reference": "Patient/P02478375538",
                    "patient_name": "Budi Santoso",
                    "patient_mrn": "MR-2023-0001",
                    "patient_birth_date": "1985-05-15",
                    "patient_age": 38,
                    "patient_gender": "MALE"
                },
                "encounter": {
                    "reference": "Encounter/ENC-2023-12345"
                },
                "requester": {
                    "reference": "Practitioner/10009880728",
                    "display": "dr. Siti Aminah, Sp.PD"
                },
                "performer": [
                    {
                        "reference": "Practitioner/10012572188",
                        "display": "dr. Ahmad Radiologi, Sp.Rad"
                    }
                ],
                "reasonCode": [
                    {
                        "coding": [
                            {
                                "system": "http://hl7.org/fhir/sid/icd-10",
                                "code": "J18.9",
                                "display": "Pneumonia, unspecified organism"
                            }
                        ]
                    }
                ]
            }
        }
    ]
}
```

**Response (201 Created):**

```json
{
    "success": true,
    "message": "Order created successfully",
    "data": {
        "id_order": "550e8400-e29b-41d4-a716-446655440000",
        "id_pelayanan": "PEL-2023-12345",
        "details": [
            {
                "id_loinc": "dbdd786d-a4f5-4fa1-90e1-eccca959c2a7",
                "accession_number": "DX20231224001",
                "schedule_date": "2023-12-24T10:00:00.000Z",
                "order_priority": "ROUTINE",
                "notes": "Pasien tidak puasa"
            }
        ]
    }
}
```

**Note:** Response mengembalikan data yang dikirim SIMRS + `id_order` + generated `accession_number`. ServiceRequest ke Satu Sehat dikirim otomatis di background.

## Data yang Dibutuhkan dari SIMRS

### Required Fields

| Field | Lokasi | Deskripsi | Contoh |
|-------|--------|-----------|--------|
| `id_loinc` | `details[].id_loinc` | ID LOINC dari master RIS | `"dbdd786d-..."` |
| `subject.reference` | `details[].service_request.subject.reference` | Patient ID dari Satu Sehat | `"Patient/P02478375538"` |
| `subject.patient_name` | `details[].service_request.subject.patient_name` | Nama pasien | `"Budi Santoso"` |
| `subject.patient_mrn` | `details[].service_request.subject.patient_mrn` | MRN pasien dari SIMRS | `"MR-2023-0001"` |
| `subject.patient_birth_date` | `details[].service_request.subject.patient_birth_date` | Tanggal lahir (YYYY-MM-DD) | `"1985-05-15"` |
| `subject.patient_age` | `details[].service_request.subject.patient_age` | Umur dalam tahun | `38` |
| `subject.patient_gender` | `details[].service_request.subject.patient_gender` | Gender: MALE/FEMALE | `"MALE"` |
| `encounter.reference` | `details[].service_request.encounter.reference` | Encounter ID dari Satu Sehat | `"Encounter/ENC-123"` |
| `requester.reference` | `details[].service_request.requester.reference` | Practitioner ID pengirim | `"Practitioner/100..."` |
| `requester.display` | `details[].service_request.requester.display` | Nama dokter pengirim | `"dr. Siti Aminah"` |
| `code.coding[]` | `details[].service_request.code.coding` | LOINC & KPTL codes | See example |

### Optional Fields

| Field | Lokasi | Deskripsi |
|-------|--------|-----------|
| `orderDetail` | `details[].service_request.orderDetail` | Modality code, AE Title, Contrast info |
| `performer` | `details[].service_request.performer` | Radiologist info |
| `reasonCode` | `details[].service_request.reasonCode` | Diagnosis ICD-10 |
| `supportingInfo` | `details[].service_request.supportingInfo` | Observation, Procedure, AllergyIntolerance IDs |
| `schedule_date` | `details[].schedule_date` | Jadwal pemeriksaan |
| `order_priority` | `details[].order_priority` | ROUTINE, URGENT, STAT |

## ACSN Format

Accession Number di-generate otomatis oleh RIS:

```
{MODALITY}{YYYYMMDD}{SEQ}
```

Contoh:
- `DX20231224001` - X-Ray Digital, tanggal 24 Des 2023, sequence 001
- `CT20231224001` - CT Scan
- `US20231224001` - Ultrasound
- `MR20231224001` - MRI

## Modality Codes

| Code | Name |
|------|------|
| DX | Digital X-Ray |
| CR | Computed Radiography |
| CT | CT Scan |
| MR | MRI |
| US | Ultrasound |
| NM | Nuclear Medicine |
| PT | PET Scan |
| XA | X-Ray Angiography |
| RF | Radiofluoroscopy |
| MG | Mammography |
| OT | Other |

## Get LOINC Master Data

Untuk mendapatkan daftar `id_loinc` yang tersedia:

```
GET /api/loinc?per_page=100
```

Response akan berisi daftar LOINC dengan modality yang terkait.

## Error Handling

### 400 Bad Request

```json
{
    "message": "Invalid request body",
    "errors": {
        "details.0.service_request.subject": ["Required"]
    }
}
```

### 404 Not Found

```json
{
    "message": "Order not found"
}
```

### 500 Internal Server Error

```json
{
    "message": "Failed to create order"
}
```
