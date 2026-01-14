# 📚 Dokumentasi: Cara Kerja Modality Mapping

## 🎯 Overview

Script `pacs-to-database.ts` secara otomatis melakukan **mapping modality code dari PACS ke modality ID di database**.

---

## 🔄 Flow Diagram

```
PACS Study → Get Series → Modality Code → Lookup Database → Get Modality ID → Save to Detail Order
   ↓            ↓             ↓                ↓                    ↓                  ↓
Study ID    Series ID      "CR"         tb_modality          df55e7e0-...      id_modality field
```

---

## 📝 Step-by-Step Implementation

### **STEP 1: Import Dependencies**

```typescript
import { modalityTable } from "../src/database/schemas/schema-modality";
import { eq } from "drizzle-orm";
```

**Penjelasan:**
- Import table schema modality
- Import `eq` untuk query WHERE clause

---

### **STEP 2: Cache Mechanism**

```typescript
const modalityCache = new Map<string, string>();
```

**Penjelasan:**
- Buat cache Map untuk menyimpan mapping: `code → id`
- **Tujuan**: Hindari query database berulang untuk code yang sama
- **Benefit**: Performa lebih cepat (515 studies hanya query modality 6x)

---

### **STEP 3: Function getModalityId()**

```typescript
async function getModalityId(modalityCode: string): Promise<string | null> {
    // 1. Validasi input
    if (!modalityCode || modalityCode === "N/A") return null;
    
    // 2. Cek cache dulu
    if (modalityCache.has(modalityCode)) {
        return modalityCache.get(modalityCode) || null;
    }
    
    // 3. Query database
    try {
        const result = await db.select()
            .from(modalityTable)
            .where(eq(modalityTable.code, modalityCode))
            .limit(1);
        
        // 4. Simpan ke cache & return ID
        if (result.length > 0) {
            modalityCache.set(modalityCode, result[0].id);
            return result[0].id;
        }
    } catch (error) {
        // Modality not found
    }
    
    // 5. Return null jika tidak ditemukan
    return null;
}
```

**Penjelasan Detail:**

1. **Validasi**: Cek apakah code valid
2. **Cache Check**: Cek apakah sudah pernah di-query sebelumnya
3. **Database Query**: Query `tb_modality` dengan WHERE code = modalityCode
4. **Save to Cache**: Simpan hasil ke cache untuk dipakai lagi
5. **Return**: Return UUID modality atau null

---

### **STEP 4: Ambil Modality dari PACS**

```typescript
// Get series information for Modality
let modalityCode = "";
let modalityId: string | null = null;

if (study.Series.length > 0) {
    try {
        const series = await getSeriesDetails(study.Series[0]);
        modalityCode = series.MainDicomTags.Modality || "";
        
        // Lookup modality ID
        if (modalityCode) {
            modalityId = await getModalityId(modalityCode);
        }
    } catch (error) {
        if (verbose) console.log(`   ⚠️  Could not fetch series modality`);
    }
}
```

**Penjelasan:**
1. Ambil series pertama dari study
2. Extract modality code (CR, CT, MR, dll)
3. Panggil `getModalityId()` untuk dapat UUID
4. Handle error jika series tidak ada

---

### **STEP 5: Simpan ke Detail Order**

```typescript
const detailOrderData = {
    accession_number: accessionNumber,
    order_number: study.MainDicomTags.StudyID || null,
    schedule_date: ...,
    notes: ...,
    pacs_study_url: ...,
    id_modality: modalityId,  // ← UUID modality dari mapping
    order_status: "FINAL" as const,
};
```

**Penjelasan:**
- Field `id_modality` otomatis terisi dengan UUID
- Jika modality tidak ditemukan di database, akan null

---

## 📊 Contoh Mapping

### **Data di Database:**

| ID (UUID) | Code | Name |
|---|---|---|
| df55e7e0-c275-... | CR | X-Ray |
| 1fe14be9-481c-... | CT | Computed Tomography |
| 117b3412-2af7-... | MR | Magnetic Resonance |
| 23967887-41a4-... | DX | Digital Radiography |

### **Proses Mapping:**

```
PACS Study → Modality Code "CR" 
           ↓
getModalityId("CR") 
           ↓
Query: SELECT * FROM tb_modality WHERE code = 'CR'
           ↓
Result: { id: "df55e7e0-c275-...", code: "CR", ... }
           ↓
Cache.set("CR", "df55e7e0-c275-...")
           ↓
Return: "df55e7e0-c275-..."
           ↓
detailOrderData.id_modality = "df55e7e0-c275-..."
```

### **Hasil di Database:**

```sql
INSERT INTO tb_detail_order (
    accession_number,
    id_modality,
    order_status,
    ...
) VALUES (
    '2512311427571',
    'df55e7e0-c275-498c-bf38-9ca34fd39fee',  -- UUID modality CR
    'FINAL',
    ...
);
```

---

## ⚡ Performance Optimization

### **Tanpa Cache:**
```
515 studies × 1 query per study = 515 database queries
```

### **Dengan Cache:**
```
6 unique modalities × 1 query = 6 database queries
509 studies menggunakan cache
```

**Speedup**: ~85x lebih cepat! 🚀

---

## 🔧 Cara Menambah Modality Baru

Jika ada modality baru di PACS yang belum ada di database:

### **Opsi 1: Manual via SQL**

```sql
INSERT INTO tb_modality (code, name, aet, description, is_active)
VALUES ('XA', 'X-Ray Angiography', ARRAY['XA0001'], 'Pemeriksaan Angiografi', true);
```

### **Opsi 2: Script**

```bash
# Edit script add-modalities.ts
# Tambahkan modality baru
# Run script
bun run scripts/add-modalities.ts
```

### **Opsi 3: Via API** (jika sudah ada endpoint)

```http
POST /api/modality
{
  "code": "XA",
  "name": "X-Ray Angiography",
  "aet": ["XA0001"],
  "description": "Pemeriksaan Angiografi"
}
```

---

## 📋 Validation & Error Handling

### **Scenario 1: Modality Tidak Ditemukan**
```typescript
modalityId = await getModalityId("UNKNOWN");
// Result: null
// Database: id_modality akan null
```

### **Scenario 2: Modality Kosong**
```typescript
modalityId = await getModalityId("");
// Result: null (early return)
```

### **Scenario 3: Series Tidak Ada**
```typescript
if (study.Series.length > 0) { ... }
// Tidak masuk ke blok ini
// modalityId tetap null
```

---

## 🎯 Best Practices

1. ✅ **Selalu gunakan cache** untuk performa
2. ✅ **Handle null gracefully** - tidak semua study punya modality
3. ✅ **Log jika tidak ditemukan** (optional, untuk monitoring)
4. ✅ **Pastikan modality sudah ada** di database sebelum import
5. ✅ **Gunakan unique code** untuk modality

---

## 🔍 Debugging

### **Cek Modality di Database:**
```bash
bun run scripts/check-modality.ts
```

### **Test Mapping 1 Study:**
```bash
bun run scripts/pacs-to-database.ts --limit=1 --verbose
```

Output akan menampilkan:
```
Modality: CR (ID: df55e7e0...)
```

### **Lihat Cache di Console:**
```typescript
console.log('Cache:', modalityCache);
// Map(6) { 'CR' => 'df55e7e0...', 'CT' => '1fe14be9...', ... }
```

---

## ✅ Summary

**Modality Mapping** adalah proses otomatis yang:
1. 📡 Ambil modality code dari PACS (CR, CT, MR, dll)
2. 🔍 Cari UUID modality di database
3. 💾 Simpan UUID ke `id_modality` field
4. ⚡ Gunakan cache untuk performance
5. 🛡️ Handle error dengan gracefully

**Result**: Setiap order otomatis ter-link dengan modality yang benar di database! 🎉

---

**Created**: 2026-01-14  
**Script**: `scripts/pacs-to-database.ts`  
**Function**: `getModalityId()`
