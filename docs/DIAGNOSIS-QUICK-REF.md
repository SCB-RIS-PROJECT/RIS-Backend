# Diagnosis API - Quick Reference

## 📋 Format Data Diagnosis

### Di Request/Response (API)
```typescript
{
  diagnosis: {
    code: "J18.9",        // ICD-10 code
    display: "Pneumonia, unspecified organism"
  }
}
```

### Di Database
```sql
-- Table: tb_detail_order
diagnosis_code    VARCHAR(50)   -- "J18.9"
diagnosis_display VARCHAR(255)  -- "Pneumonia, unspecified organism"
diagnosis         TEXT          -- "J18.9 - Pneumonia..." (legacy backup)
```

---

## 🔄 API Endpoints

### 1️⃣ Create Order (dari SIMRS)
```http
POST /api/orders/simrs
Content-Type: application/json
Authorization: Bearer {token}

{
  "details": [{
    "diagnosa": {
      "system": "http://hl7.org/fhir/sid/icd-10",
      "code": "J18.9",
      "display": "Pneumonia, unspecified organism"
    },
    // ... other fields
  }]
}
```

**✅ Hasil:**
- `diagnosis_code` = "J18.9"
- `diagnosis_display` = "Pneumonia, unspecified organism"

---

### 2️⃣ Update Diagnosis (dari RIS)
```http
PATCH /api/orders/{orderId}/details/{detailId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "diagnosis": {
    "code": "J18.0",
    "display": "Bronchopneumonia, unspecified organism"
  }
}
```

**✅ Hasil:**
- Diagnosis di-update ke code dan display yang baru
- Field lain tidak berubah

---

### 3️⃣ Update Status Tanpa Ubah Diagnosis
```http
PATCH /api/orders/{orderId}/details/{detailId}

{
  "order_status": "COMPLETED",
  "notes": "Pemeriksaan selesai"
}
```

**✅ Hasil:**
- Status dan notes di-update
- Diagnosis tetap sama

---

### 4️⃣ Get Order (Response)
```http
GET /api/orders/{orderId}

Response:
{
  "details": [{
    "diagnosis": {
      "code": "J18.9",
      "display": "Pneumonia, unspecified organism"
    },
    // ... other fields
  }]
}
```

---

## 💾 Database Query Examples

### Insert dengan Diagnosis
```typescript
await db.insert(detailOrderTable).values({
  diagnosis_code: "J18.9",
  diagnosis_display: "Pneumonia, unspecified organism",
  diagnosis: "J18.9 - Pneumonia, unspecified organism", // backup
  // ... other fields
});
```

### Update Diagnosis
```typescript
await db.update(detailOrderTable)
  .set({
    diagnosis_code: "J18.0",
    diagnosis_display: "Bronchopneumonia",
    diagnosis: "J18.0 - Bronchopneumonia", // backup
    updated_at: new Date()
  })
  .where(eq(detailOrderTable.id, detailId));
```

### Query Berdasarkan Diagnosis Code
```typescript
const orders = await db
  .select()
  .from(detailOrderTable)
  .where(eq(detailOrderTable.diagnosis_code, "J18.9"));
```

### Search Diagnosis Display
```typescript
const orders = await db
  .select()
  .from(detailOrderTable)
  .where(ilike(detailOrderTable.diagnosis_display, "%pneumonia%"));
```

---

## 🎯 Use Cases

### Use Case 1: SIMRS Create Order
```bash
# SIMRS mengirim order dengan diagnosis dari dokter
curl -X POST http://localhost:3000/api/orders/simrs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @simrs-order.json
```

### Use Case 2: Radiolog Update Diagnosis
```bash
# Radiolog mengupdate diagnosis setelah baca hasil
curl -X PATCH http://localhost:3000/api/orders/$ORDER_ID/details/$DETAIL_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "diagnosis": {
      "code": "J18.0",
      "display": "Bronchopneumonia, unspecified organism"
    },
    "order_status": "COMPLETED"
  }'
```

### Use Case 3: RIS Update Status Only
```bash
# RIS update status tanpa ubah diagnosis
curl -X PATCH http://localhost:3000/api/orders/$ORDER_ID/details/$DETAIL_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_status": "IN_PROGRESS",
    "notes": "Pemeriksaan sedang berlangsung"
  }'
```

---

## ⚠️ Important Notes

1. **Backward Compatibility**
   - Field `diagnosis` (TEXT) masih ada sebagai backup
   - Format: "CODE - Display"
   - Tidak digunakan di API response (hanya untuk backup)

2. **Null Handling**
   - Jika tidak ada diagnosis, keduanya null
   - Jika hanya ada salah satu, field lainnya null

3. **Validation**
   - `diagnosis.code`: Optional string (max 50 chars)
   - `diagnosis.display`: Optional string (max 255 chars)

4. **Index**
   - Ada index di `diagnosis_code` untuk query performa

---

## 🧪 Testing

Run test script:
```bash
# Edit AUTH_TOKEN di file dulu
bun run scripts/test-diagnosis-split.ts
```

---

## 📚 Full Documentation

Lihat [DIAGNOSIS-API-USAGE.md](./DIAGNOSIS-API-USAGE.md) untuk dokumentasi lengkap.
