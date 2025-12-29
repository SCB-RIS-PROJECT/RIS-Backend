# Complete Order & Send to Satu Sehat - Postman Guide

## Endpoint

```
POST /api/orders/{orderId}/details/{detailId}/complete
```

## Overview

Endpoint ini digunakan untuk:
1. **Melengkapi data order** yang belum lengkap (modality, AE title, performer, contrast, dll)
2. **Build ServiceRequest lengkap** untuk Satu Sehat
3. **POST ke Satu Sehat** secara realtime
4. **Menyimpan ServiceRequest ID** dari response Satu Sehat ke database
5. ServiceRequest ID ini nanti digunakan untuk **push ke MWL**

---

## Headers

```
Content-Type: application/json
Authorization: Bearer {{auth_token}}
```

---

## Path Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `orderId` | UUID | Yes | ID order utama | `550e8400-e29b-41d4-a716-446655440000` |
| `detailId` | UUID | Yes | ID detail order | `650e8400-e29b-41d4-a716-446655440001` |

---

## Request Body

### Required Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `modality_code` | string | **Yes** | Kode modality DICOM | `"DX"`, `"CT"`, `"MR"`, `"US"` |
| `ae_title` | string | **Yes** | Application Entity Title workstation | `"XR0001"`, `"CT0001"` |
| `performer_id` | string | **Yes** | Practitioner ID dari Satu Sehat | `"10012572188"` |
| `performer_name` | string | **Yes** | Nama lengkap performer | `"dr. John Doe, Sp.Rad"` |

### Optional Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `contrast_code` | string | No | KFA code untuk kontras | `"91000928"` |
| `contrast_name` | string | No | Nama kontras | `"Barium Sulfate"` |
| `observation_id` | string | No | Observation ID dari Satu Sehat | `"6a1e6c6c-9f6f-4e09-b72a-3f8dcd8a7f32"` |
| `procedure_id` | string | No | Procedure ID dari Satu Sehat | `"1f4b3e39-78a0-463f-bd62-82f792911800"` |
| `allergy_intolerance_id` | string | No | AllergyIntolerance ID | `"94093c7e-066b-4081-b0a9-e68e20d888f0"` |

---

## Request Examples

### 1. Basic Request (Minimum Required)

```json
{
  "modality_code": "DX",
  "ae_title": "XR0001",
  "performer_id": "10012572188",
  "performer_name": "dr. John Radiologist, Sp.Rad"
}
```

### 2. With Contrast

```json
{
  "modality_code": "CT",
  "ae_title": "CT0001",
  "performer_id": "10012572188",
  "performer_name": "dr. John Radiologist, Sp.Rad",
  "contrast_code": "91000928",
  "contrast_name": "Barium Sulfate"
}
```

### 3. Complete Request (All Fields)

```json
{
  "modality_code": "DX",
  "ae_title": "XR0001",
  "performer_id": "10012572188",
  "performer_name": "dr. John Radiologist, Sp.Rad",
  "contrast_code": "91000928",
  "contrast_name": "Barium Sulfate",
  "observation_id": "6a1e6c6c-9f6f-4e09-b72a-3f8dcd8a7f32",
  "procedure_id": "1f4b3e39-78a0-463f-bd62-82f792911800",
  "allergy_intolerance_id": "94093c7e-066b-4081-b0a9-e68e20d888f0"
}
```

---

## Response Examples

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Order completed and sent to Satu Sehat successfully",
  "data": {
    "detail_id": "650e8400-e29b-41d4-a716-446655440001",
    "accession_number": "DX20251229001",
    "service_request_id": "5c6a22c6-545a-41da-b75b-f77fd5800358",
    "service_request_url": "https://api-satusehat.kemkes.go.id/fhir-r4/v1/ServiceRequest/5c6a22c6-545a-41da-b75b-f77fd5800358"
  }
}
```

### Error Responses

#### Not Found (404)
```json
{
  "success": false,
  "message": "Order detail not found"
}
```

#### Missing Required Data (400)
```json
{
  "success": false,
  "message": "Missing accession number"
}
```

#### Satu Sehat Error (500)
```json
{
  "success": false,
  "message": "Failed to send to Satu Sehat: Invalid patient reference"
}
```

---

## Flow Diagram

```
Frontend
   ↓
   │ POST /api/orders/{id}/details/{detailId}/complete
   │ {modality_code, ae_title, performer_id, ...}
   ↓
Backend (RIS)
   │
   ├─→ 1. Update detail order di database
   │     (modality_code, ae_title, performer, contrast, dll)
   │
   ├─→ 2. Build ServiceRequest lengkap
   │     (identifier, code, orderDetail, subject, encounter, dll)
   │
   ├─→ 3. POST ke Satu Sehat /ServiceRequest
   │     ↓
   │   Satu Sehat
   │     ↓
   │     Response: {id: "5c6a22c6-..."}
   │
   ├─→ 4. Simpan service_request_id ke database
   │     (id_service_request_ss)
   │
   └─→ 5. Return success response
       ↓
Frontend
```

---

## What Gets Sent to Satu Sehat

Ketika endpoint ini dipanggil, backend akan build dan mengirim ServiceRequest berikut ke Satu Sehat:

```json
{
  "resourceType": "ServiceRequest",
  "identifier": [
    {
      "system": "http://sys-ids.kemkes.go.id/servicerequest/{{Org_id}}",
      "value": "{{Generated_SR_ID}}"
    },
    {
      "use": "usual",
      "type": {
        "coding": [
          {
            "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
            "code": "ACSN"
          }
        ]
      },
      "system": "http://sys-ids.kemkes.go.id/acsn/{{Org_id}}",
      "value": "DX20251229001"
    }
  ],
  "status": "active",
  "intent": "original-order",
  "priority": "routine",
  "category": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "363679005",
          "display": "Imaging"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "24648-8",
        "display": "XR Chest PA upright"
      },
      {
        "system": "http://terminology.kemkes.go.id/CodeSystem/kptl",
        "code": "31243.NP001.AP005",
        "display": "Radiografi Thorax 1 proyeksi"
      }
    ],
    "text": "Pemeriksaan CXR PA"
  },
  "orderDetail": [
    {
      "coding": [
        {
          "system": "http://dicom.nema.org/resources/ontology/DCM",
          "code": "DX"
        }
      ],
      "text": "Modality Code: DX"
    },
    {
      "coding": [
        {
          "system": "http://sys-ids.kemkes.go.id/ae-title",
          "display": "XR0001"
        }
      ]
    },
    {
      "coding": [
        {
          "system": "http://sys-ids.kemkes.go.id/kfa",
          "code": "91000928",
          "display": "Barium Sulfate"
        }
      ]
    }
  ],
  "subject": {
    "reference": "Patient/100000030006"
  },
  "encounter": {
    "reference": "Encounter/c65b7d8b-b691-4d71-9dbf-561e15c2e8b5"
  },
  "occurrenceDateTime": "2025-12-29T10:00:00+00:00",
  "requester": {
    "reference": "Practitioner/N10000001",
    "display": "dr. Jane Smith"
  },
  "performer": [
    {
      "reference": "Practitioner/10012572188",
      "display": "dr. John Radiologist, Sp.Rad"
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
  ],
  "supportingInfo": [
    {
      "reference": "Observation/6a1e6c6c-9f6f-4e09-b72a-3f8dcd8a7f32"
    },
    {
      "reference": "Procedure/1f4b3e39-78a0-463f-bd62-82f792911800"
    },
    {
      "reference": "AllergyIntolerance/94093c7e-066b-4081-b0a9-e68e20d888f0"
    }
  ]
}
```

---

## Postman Collection

```json
{
  "name": "Complete Order and Send to Satu Sehat",
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Content-Type",
        "value": "application/json"
      },
      {
        "key": "Authorization",
        "value": "Bearer {{auth_token}}"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"modality_code\": \"DX\",\n  \"ae_title\": \"XR0001\",\n  \"performer_id\": \"10012572188\",\n  \"performer_name\": \"dr. John Radiologist, Sp.Rad\",\n  \"contrast_code\": \"91000928\",\n  \"contrast_name\": \"Barium Sulfate\",\n  \"observation_id\": \"6a1e6c6c-9f6f-4e09-b72a-3f8dcd8a7f32\",\n  \"procedure_id\": \"1f4b3e39-78a0-463f-bd62-82f792911800\",\n  \"allergy_intolerance_id\": \"94093c7e-066b-4081-b0a9-e68e20d888f0\"\n}"
    },
    "url": {
      "raw": "{{base_url}}/api/orders/{{orderId}}/details/{{detailId}}/complete",
      "host": ["{{base_url}}"],
      "path": ["api", "orders", "{{orderId}}", "details", "{{detailId}}", "complete"]
    }
  }
}
```

---

## Postman Pre-request Script

Simpan ServiceRequest ID untuk request berikutnya:

```javascript
// Save service request ID from response
pm.test("Save ServiceRequest ID", function() {
    var jsonData = pm.response.json();
    if (jsonData.success && jsonData.data) {
        pm.environment.set("service_request_id", jsonData.data.service_request_id);
        pm.environment.set("service_request_url", jsonData.data.service_request_url);
        console.log("ServiceRequest ID saved:", jsonData.data.service_request_id);
    }
});
```

---

## Postman Tests

```javascript
// Test status code
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Test success response
pm.test("Response is successful", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
});

// Test response has data
pm.test("Response has ServiceRequest ID", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data).to.have.property('service_request_id');
    pm.expect(jsonData.data.service_request_id).to.be.a('string');
});

// Test ServiceRequest URL format
pm.test("ServiceRequest URL is valid", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.service_request_url).to.include('ServiceRequest/');
});

// Save for next request
pm.environment.set("last_service_request_id", pm.response.json().data.service_request_id);
```

---

## cURL Example

```bash
curl -X POST "http://localhost:3000/api/orders/550e8400-e29b-41d4-a716-446655440000/details/650e8400-e29b-41d4-a716-446655440001/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "modality_code": "DX",
    "ae_title": "XR0001",
    "performer_id": "10012572188",
    "performer_name": "dr. John Radiologist, Sp.Rad",
    "contrast_code": "91000928",
    "contrast_name": "Barium Sulfate",
    "observation_id": "6a1e6c6c-9f6f-4e09-b72a-3f8dcd8a7f32",
    "procedure_id": "1f4b3e39-78a0-463f-bd62-82f792911800",
    "allergy_intolerance_id": "94093c7e-066b-4081-b0a9-e68e20d888f0"
  }'
```

---

## Use Cases

### Use Case 1: Complete Order dari RIS Frontend

**Scenario:** Teknisi radiologi melengkapi data order sebelum pemeriksaan

**Steps:**
1. Frontend menampilkan form untuk input data lengkap
2. User input: modality, AE title, performer, contrast (jika perlu)
3. Frontend POST ke endpoint ini
4. Backend update data, kirim ke Satu Sehat, simpan ServiceRequest ID
5. Frontend menampilkan success message dengan ServiceRequest ID

### Use Case 2: Complete dan Push ke MWL

**Scenario:** Complete order dan langsung push ke MWL

**Steps:**
1. POST `/api/orders/{id}/details/{detailId}/complete` (complete order)
2. GET response dengan `service_request_id`
3. POST `/api/orders/{id}/push-to-mwl?target=dcm4chee` (push ke MWL)

### Use Case 3: Batch Complete Multiple Details

**Scenario:** Complete multiple order details sekaligus

**Steps:**
Loop through each detail:
```javascript
for (const detail of orderDetails) {
  await completeOrderDetail(orderId, detail.id, {
    modality_code: detail.modality,
    ae_title: detail.ae_title,
    performer_id: performerId,
    performer_name: performerName
  });
}
```

---

## Next Steps After Complete

Setelah order complete dan ServiceRequest ID tersimpan:

1. **View Order Detail**
   ```
   GET /api/orders/{orderId}
   ```
   Response akan include `id_service_request_ss`

2. **Push to MWL**
   ```
   POST /api/orders/{orderId}/push-to-mwl?target=dcm4chee
   ```
   Menggunakan ServiceRequest ID untuk push ke modality worklist

3. **Send to Satu Sehat (if needed)**
   ServiceRequest sudah terkirim, tapi bisa send additional resources seperti Observation atau Procedure

---

## Troubleshooting

### Problem: Missing patient or encounter reference
**Solution:** Pastikan order dibuat dari SIMRS dengan data lengkap

### Problem: Invalid performer ID
**Solution:** Gunakan Practitioner ID yang valid dari Satu Sehat

### Problem: Satu Sehat timeout
**Solution:** Retry request atau check Satu Sehat status

### Problem: ServiceRequest ID not saved
**Solution:** Check database connection dan logs

---

## Database Updates

Setelah endpoint ini dipanggil, database field berikut akan di-update:

| Field | Description | Example |
|-------|-------------|---------|
| `modality_code` | Modality code | `"DX"` |
| `ae_title` | AE Title | `"XR0001"` |
| `id_performer_ss` | Performer ID | `"10012572188"` |
| `performer_display` | Performer name | `"dr. John Radiologist"` |
| `contrast_code` | Contrast code (optional) | `"91000928"` |
| `contrast_name_kfa` | Contrast name (optional) | `"Barium Sulfate"` |
| `id_observation_ss` | Observation ID (optional) | `"6a1e6c6c-..."` |
| `id_procedure_ss` | Procedure ID (optional) | `"1f4b3e39-..."` |
| `id_allergy_intolerance_ss` | Allergy ID (optional) | `"94093c7e-..."` |
| **`id_service_request_ss`** | **ServiceRequest ID** | **`"5c6a22c6-..."`** |
| `updated_at` | Update timestamp | `2025-12-29T10:30:00Z` |

---

## Important Notes

1. **Realtime**: Request ke Satu Sehat dilakukan secara realtime, tidak background job
2. **Idempotent**: Jika dipanggil ulang, akan update data dan POST ulang ke Satu Sehat (Satu Sehat akan update, bukan create baru)
3. **ServiceRequest ID**: ID yang dikembalikan dari Satu Sehat SANGAT PENTING untuk:
   - Tracking di Satu Sehat
   - Push ke MWL
   - Reporting dan audit trail
4. **Required Data**: Pastikan order sudah punya data minimum dari SIMRS sebelum complete

---

## Related Endpoints

- `POST /api/orders/simrs` - Create order dari SIMRS
- `GET /api/orders/{id}` - Get order detail
- `PATCH /api/orders/{id}/details/{detailId}` - Update order detail
- `POST /api/orders/{id}/push-to-mwl` - Push ke MWL
