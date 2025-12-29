# Postman Collection - Update Order Endpoints

## 1. Update Detail Order (Diagnosis, Status, Notes)

### Basic Info
- **Method:** `PATCH`
- **URL:** `{{base_url}}/api/orders/{{orderId}}/details/{{detailId}}`
- **Description:** Update order detail termasuk diagnosis, status, schedule, notes, dan Satu Sehat IDs

### Headers
```
Content-Type: application/json
Authorization: Bearer {{auth_token}}
```

### Path Variables
| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `orderId` | UUID | ID order utama | `550e8400-e29b-41d4-a716-446655440000` |
| `detailId` | UUID | ID detail order | `650e8400-e29b-41d4-a716-446655440001` |

---

## 2. Request Body Examples

### A. Update Diagnosis Saja
```json
{
  "diagnosis": {
    "code": "J18.0",
    "display": "Bronchopneumonia, unspecified organism"
  }
}
```

### B. Update Diagnosis + Status + Notes (Paling Umum)
```json
{
  "diagnosis": {
    "code": "J18.0",
    "display": "Bronchopneumonia, unspecified organism"
  },
  "order_status": "COMPLETED",
  "notes": "Hasil foto thorax PA:\n- Tampak infiltrat pada lobus kanan bawah\n- Konsisten dengan bronchopneumonia\n- Tidak tampak efusi pleura\n- Cor dalam batas normal\n\nKesimpulan: Bronchopneumonia lobus kanan bawah"
}
```

### C. Update Status Tanpa Ubah Diagnosis
```json
{
  "order_status": "IN_PROGRESS",
  "notes": "Pemeriksaan sedang berlangsung, pasien sudah positioning"
}
```

### D. Update Schedule Date + Priority
```json
{
  "schedule_date": "2025-12-30T14:00:00Z",
  "order_priority": "URGENT",
  "notes": "Pasien kondisi memburuk, prioritas dinaikkan"
}
```

### E. Update Complete (Semua Field)
```json
{
  "schedule_date": "2025-12-29T10:00:00Z",
  "order_priority": "URGENT",
  "order_status": "COMPLETED",
  "diagnosis": {
    "code": "J18.1",
    "display": "Lobar pneumonia, unspecified organism"
  },
  "notes": "Pemeriksaan selesai dengan hasil definitif",
  "id_service_request_ss": "SR-12345",
  "id_observation_ss": "OBS-67890",
  "id_procedure_ss": "PROC-11111"
}
```

### F. Clear/Hapus Diagnosis
```json
{
  "diagnosis": {
    "code": null,
    "display": null
  },
  "notes": "Diagnosis dihapus karena salah input"
}
```

---

## 3. Response Examples

### Success Response (200 OK)
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440001",
  "accession_number": "CT20251229001",
  "order_number": "ORD-CT20251229001",
  "schedule_date": "2025-12-29T10:00:00.000Z",
  "order_priority": "URGENT",
  "order_status": "COMPLETED",
  "diagnosis": {
    "code": "J18.0",
    "display": "Bronchopneumonia, unspecified organism"
  },
  "notes": "Hasil foto thorax PA:\n- Tampak infiltrat pada lobus kanan bawah\n- Konsisten dengan bronchopneumonia\n- Tidak tampak efusi pleura\n- Cor dalam batas normal\n\nKesimpulan: Bronchopneumonia lobus kanan bawah",
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
    "id_service_request": "SR-12345",
    "id_observation": "OBS-67890",
    "id_procedure": "PROC-11111"
  },
  "created_at": "2025-12-29T08:00:00.000Z",
  "updated_at": "2025-12-29T10:30:00.000Z"
}
```

### Error Response - Not Found (404)
```json
{
  "message": "Order detail not found"
}
```

### Error Response - Unauthorized (401)
```json
{
  "message": "Not authenticated"
}
```

### Error Response - Forbidden (403)
```json
{
  "message": "Permission denied"
}
```

### Error Response - Bad Request (400)
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

## 4. Field Definitions

### Request Body Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `schedule_date` | string (ISO 8601) | No | Tanggal jadwal pemeriksaan | `"2025-12-29T10:00:00Z"` |
| `order_priority` | enum | No | Prioritas order | `"ROUTINE"`, `"URGENT"`, `"ASAP"`, `"STAT"` |
| `order_status` | enum | No | Status order | `"PENDING"`, `"IN_PROGRESS"`, `"COMPLETED"`, `"CANCELLED"` |
| `diagnosis` | object | No | Diagnosis object | See below |
| `diagnosis.code` | string | No | ICD-10 code | `"J18.0"` |
| `diagnosis.display` | string | No | Deskripsi diagnosis | `"Bronchopneumonia"` |
| `notes` | string | No | Catatan tambahan | Any text |
| `id_service_request_ss` | string | No | Satu Sehat ServiceRequest ID | `"SR-12345"` |
| `id_observation_ss` | string | No | Satu Sehat Observation ID | `"OBS-67890"` |
| `id_procedure_ss` | string | No | Satu Sehat Procedure ID | `"PROC-11111"` |

### Order Status Enum
- `PENDING` - Order baru, belum dikerjakan
- `IN_PROGRESS` - Sedang dikerjakan
- `COMPLETED` - Selesai
- `CANCELLED` - Dibatalkan

### Order Priority Enum
- `ROUTINE` - Prioritas normal
- `URGENT` - Mendesak (dalam 24 jam)
- `ASAP` - Secepat mungkin (dalam beberapa jam)
- `STAT` - Segera/emergency (langsung)

---

## 5. Postman Environment Variables

Setup di Postman Environment:

```json
{
  "base_url": "http://localhost:3000",
  "auth_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "detailId": "650e8400-e29b-41d4-a716-446655440001"
}
```

---

## 6. Postman Pre-request Script

Untuk auto set variables dari response sebelumnya:

```javascript
// After creating order, save IDs
if (pm.response.code === 201) {
    var jsonData = pm.response.json();
    
    // Set order ID
    if (jsonData.order && jsonData.order.id) {
        pm.environment.set("orderId", jsonData.order.id);
    } else if (jsonData.id) {
        pm.environment.set("orderId", jsonData.id);
    }
    
    // Set detail ID from first detail
    if (jsonData.order && jsonData.order.details && jsonData.order.details[0]) {
        pm.environment.set("detailId", jsonData.order.details[0].id);
    } else if (jsonData.details && jsonData.details[0]) {
        pm.environment.set("detailId", jsonData.details[0].id);
    }
}
```

---

## 7. Postman Tests Script

Untuk validation response:

```javascript
// Test status code
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Test response structure
pm.test("Response has diagnosis object", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('diagnosis');
});

// Test diagnosis format
pm.test("Diagnosis has code and display", function () {
    var jsonData = pm.response.json();
    if (jsonData.diagnosis) {
        pm.expect(jsonData.diagnosis).to.have.property('code');
        pm.expect(jsonData.diagnosis).to.have.property('display');
    }
});

// Test diagnosis update
pm.test("Diagnosis updated correctly", function () {
    var jsonData = pm.response.json();
    var requestBody = JSON.parse(pm.request.body.raw);
    
    if (requestBody.diagnosis && requestBody.diagnosis.code) {
        pm.expect(jsonData.diagnosis.code).to.eql(requestBody.diagnosis.code);
    }
});

// Save response for next request
pm.environment.set("lastResponse", JSON.stringify(pm.response.json()));
```

---

## 8. cURL Examples

### Update Diagnosis
```bash
curl -X PATCH "http://localhost:3000/api/orders/550e8400-e29b-41d4-a716-446655440000/details/650e8400-e29b-41d4-a716-446655440001" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "diagnosis": {
      "code": "J18.0",
      "display": "Bronchopneumonia, unspecified organism"
    }
  }'
```

### Update Complete Order
```bash
curl -X PATCH "http://localhost:3000/api/orders/550e8400-e29b-41d4-a716-446655440000/details/650e8400-e29b-41d4-a716-446655440001" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "diagnosis": {
      "code": "J18.0",
      "display": "Bronchopneumonia, unspecified organism"
    },
    "order_status": "COMPLETED",
    "notes": "Pemeriksaan selesai, hasil normal"
  }'
```

---

## 9. Common Use Cases

### Use Case 1: Radiolog Update Diagnosis Setelah Baca Hasil
```json
{
  "diagnosis": {
    "code": "J18.0",
    "display": "Bronchopneumonia, unspecified organism"
  },
  "order_status": "COMPLETED",
  "notes": "Hasil foto thorax PA menunjukkan infiltrat lobus kanan bawah konsisten dengan bronchopneumonia"
}
```

### Use Case 2: Teknisi Update Status Pemeriksaan
```json
{
  "order_status": "IN_PROGRESS",
  "notes": "Pasien sedang positioning untuk foto thorax PA"
}
```

### Use Case 3: Admin RIS Koreksi Diagnosis
```json
{
  "diagnosis": {
    "code": "J18.1",
    "display": "Lobar pneumonia, unspecified organism"
  },
  "notes": "Diagnosis dikoreksi sesuai hasil review"
}
```

### Use Case 4: Reschedule Pemeriksaan
```json
{
  "schedule_date": "2025-12-30T09:00:00Z",
  "order_priority": "URGENT",
  "notes": "Dijadwalkan ulang karena pasien belum puasa"
}
```

---

## 10. Troubleshooting

### Problem: 401 Unauthorized
**Solution:** Pastikan token valid dan belum expired
```bash
# Get new token
POST /api/auth/login
```

### Problem: 403 Forbidden
**Solution:** User tidak punya permission `update:order`
```bash
# Check user permissions
GET /api/auth/me
```

### Problem: 404 Not Found
**Solution:** 
- Pastikan `orderId` dan `detailId` benar
- Cek dengan GET order terlebih dahulu

### Problem: 400 Bad Request - Invalid diagnosis format
**Solution:** Pastikan diagnosis adalah object dengan `code` dan `display`
```json
// ❌ Wrong
{"diagnosis": "J18.0 - Pneumonia"}

// ✅ Correct
{"diagnosis": {"code": "J18.0", "display": "Pneumonia"}}
```

---

## 11. Import to Postman

1. Copy JSON collection below
2. Open Postman → Import → Raw text
3. Paste and import

```json
{
  "info": {
    "name": "RIS API - Update Order",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Update Detail Order - Diagnosis Only",
      "request": {
        "method": "PATCH",
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
          "raw": "{\n  \"diagnosis\": {\n    \"code\": \"J18.0\",\n    \"display\": \"Bronchopneumonia, unspecified organism\"\n  }\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/orders/{{orderId}}/details/{{detailId}}",
          "host": ["{{base_url}}"],
          "path": ["api", "orders", "{{orderId}}", "details", "{{detailId}}"]
        }
      }
    },
    {
      "name": "Update Detail Order - Complete",
      "request": {
        "method": "PATCH",
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
          "raw": "{\n  \"diagnosis\": {\n    \"code\": \"J18.0\",\n    \"display\": \"Bronchopneumonia, unspecified organism\"\n  },\n  \"order_status\": \"COMPLETED\",\n  \"notes\": \"Pemeriksaan selesai dengan hasil normal\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/orders/{{orderId}}/details/{{detailId}}",
          "host": ["{{base_url}}"],
          "path": ["api", "orders", "{{orderId}}", "details", "{{detailId}}"]
        }
      }
    },
    {
      "name": "Update Detail Order - Status Only",
      "request": {
        "method": "PATCH",
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
          "raw": "{\n  \"order_status\": \"IN_PROGRESS\",\n  \"notes\": \"Pemeriksaan sedang berlangsung\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/orders/{{orderId}}/details/{{detailId}}",
          "host": ["{{base_url}}"],
          "path": ["api", "orders", "{{orderId}}", "details", "{{detailId}}"]
        }
      }
    }
  ]
}
```

