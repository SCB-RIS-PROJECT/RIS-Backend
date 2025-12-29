# Changelog - Diagnosis Split Feature

## [2025-12-29] - Diagnosis Code & Display Split

### 🎯 Tujuan
Memisahkan penyimpanan diagnosis menjadi dua field terpisah (`code` dan `display`) untuk memudahkan querying dan integrasi dengan sistem lain.

### 📊 Database Changes

#### Schema Changes
- ✅ Tambah kolom `diagnosis_code` (VARCHAR 50)
- ✅ Tambah kolom `diagnosis_display` (VARCHAR 255)
- ✅ Tambah index `detail_order_diagnosis_code_idx`
- 📌 Kolom `diagnosis` (TEXT) tetap ada untuk backward compatibility

#### Data Migration
- ✅ 6 records berhasil di-migrate
- ✅ Pattern split: "CODE - Display" → code & display terpisah
- ✅ Index created untuk performa query

### 🔧 Code Changes

#### Files Modified
1. **src/database/schemas/schema-order.ts**
   - Tambah field `diagnosis_code` dan `diagnosis_display`

2. **src/interface/order.interface.ts**
   - Update `DetailOrderResponse` diagnosis menjadi object
   - Update `UpdateDetailOrderInput` diagnosis menjadi object

3. **src/service/order.service.ts**
   - Update `formatDetailOrderResponse()` untuk format object
   - Update `createOrder()` untuk split diagnosis saat insert
   - Update `updateDetailOrder()` untuk handle diagnosis object
   - Update `mapSimrsServiceRequestToDetailOrder()` untuk split diagnosis

#### Files Created
1. **src/database/migrations/0010_split_diagnosis_code_display.sql**
   - SQL migration untuk split data lama

2. **scripts/split-diagnosis-data.ts**
   - Script untuk migrate existing data

3. **scripts/test-diagnosis-split.ts**
   - Test script untuk verify functionality

4. **scripts/test-diagnosis-api.sh**
   - Bash script untuk manual testing

5. **docs/DIAGNOSIS-API-USAGE.md**
   - Dokumentasi lengkap penggunaan API

6. **docs/DIAGNOSIS-QUICK-REF.md**
   - Quick reference card

7. **docs/examples/create-order-with-diagnosis.json**
   - Contoh request create order

8. **docs/examples/update-diagnosis-from-ris.json**
   - Contoh request update diagnosis

9. **docs/examples/update-status-without-diagnosis.json**
   - Contoh request update tanpa diagnosis

### 📝 API Changes

#### Request Format (Before)
```json
{
  "diagnosis": "J18.9 - Pneumonia, unspecified organism"
}
```

#### Request Format (After)
```json
{
  "diagnosis": {
    "code": "J18.9",
    "display": "Pneumonia, unspecified organism"
  }
}
```

#### Response Format (After)
```json
{
  "diagnosis": {
    "code": "J18.9",
    "display": "Pneumonia, unspecified organism"
  }
}
```

### 🔄 Affected Endpoints

#### 1. POST /api/orders/simrs
- ✅ Menerima `diagnosa.code` dan `diagnosa.display`
- ✅ Menyimpan ke `diagnosis_code` dan `diagnosis_display`

#### 2. PATCH /api/orders/{id}/details/{detailId}
- ✅ Menerima `diagnosis.code` dan `diagnosis.display`
- ✅ Update kedua field terpisah

#### 3. GET /api/orders/{id}
- ✅ Response `diagnosis` sebagai object dengan `code` dan `display`

### ✅ Testing

#### Migration Test
```bash
bun run scripts/split-diagnosis-data.ts
```
Result:
- ✅ 6 records migrated successfully
- ✅ All diagnosis split correctly

#### API Test (TypeScript)
```bash
bun run scripts/test-diagnosis-split.ts
```

#### API Test (Bash)
```bash
./scripts/test-diagnosis-api.sh http://localhost:3000 YOUR_TOKEN
```

### 📚 Documentation

- [DIAGNOSIS-API-USAGE.md](../docs/DIAGNOSIS-API-USAGE.md) - Dokumentasi lengkap
- [DIAGNOSIS-QUICK-REF.md](../docs/DIAGNOSIS-QUICK-REF.md) - Quick reference
- [README.md](../README.md) - Updated dengan link ke dokumentasi

### 🎯 Benefits

1. **Better Data Structure**
   - Code dan display terpisah
   - Mudah untuk query by code
   - Mudah untuk display formatting

2. **Improved Query Performance**
   - Index di diagnosis_code
   - Faster search by code

3. **Better Integration**
   - Sesuai dengan format FHIR/Satu Sehat
   - Mudah mapping ke sistem eksternal

4. **Backward Compatible**
   - Field lama masih ada
   - Data lama sudah di-migrate
   - Tidak break existing functionality

### 🔮 Future Improvements

1. Setelah semua sistem terintegrasi dengan format baru, field `diagnosis` (TEXT) bisa di-drop
2. Bisa tambah validation untuk ICD-10 code format
3. Bisa tambah master data ICD-10 untuk referensi

### 👥 Impact

#### SIMRS Team
- ✅ Tidak perlu ubah format request
- ✅ Sudah sesuai dengan format yang ada

#### RIS Team
- ⚠️ Perlu update UI untuk input diagnosis terpisah
- ⚠️ Update logic untuk format object `{code, display}`

#### Frontend Team
- ⚠️ Update display diagnosis dari object
- ⚠️ Update form input untuk code dan display terpisah

### 📞 Support

Jika ada pertanyaan atau issue:
1. Lihat [DIAGNOSIS-API-USAGE.md](../docs/DIAGNOSIS-API-USAGE.md)
2. Check [DIAGNOSIS-QUICK-REF.md](../docs/DIAGNOSIS-QUICK-REF.md)
3. Run test script untuk verify

---

**Status:** ✅ Completed & Tested  
**Date:** 2025-12-29  
**Version:** 1.0.0
