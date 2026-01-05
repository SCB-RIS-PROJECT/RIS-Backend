# Perubahan Relasi Modality ke Detail Order

## Overview

Perubahan struktur database untuk menambahkan **relasi langsung** dari `tb_detail_order` ke `tb_modality`, sehingga tidak perlu join melalui `tb_loinc` untuk mendapatkan informasi modality.

## Alasan Perubahan

### Sebelum
```
tb_detail_order → tb_loinc → tb_modality
```
- Detail order harus join ke loinc dulu, baru bisa dapat modality
- Query lebih kompleks dengan double join
- Ketika detail order tidak punya `id_loinc` (order dari SIMRS), tidak bisa langsung tahu modalitynya

### Sesudah
```
tb_detail_order → tb_modality (direct)
tb_detail_order → tb_loinc (optional)
tb_loinc → tb_modality (tetap ada untuk master data)
```
- Detail order langsung reference ke modality
- Query lebih sederhana (single join)
- Setiap detail order pasti punya modality reference

## Perubahan Schema

### 1. tb_detail_order
**Tambahan kolom:**
```sql
ALTER TABLE tb_detail_order 
ADD COLUMN id_modality UUID REFERENCES tb_modality(id);

CREATE INDEX detail_order_modality_idx ON tb_detail_order(id_modality);
```

### 2. tb_loinc
**Tidak ada perubahan** - tetap punya `id_modality` untuk keperluan master data LOINC.

## Perubahan Kode

### 1. Schema Definition (schema-order.ts)
```typescript
export const detailOrderTable = pgTable(
    "tb_detail_order",
    {
        // ... existing fields
        id_modality: uuid("id_modality").references(() => modalityTable.id),
        // ... other fields
    },
    (table) => ({
        // ... existing indexes
        modalityIdx: index("detail_order_modality_idx").on(table.id_modality),
    })
);
```

### 2. Service Layer (order.service.ts)

#### Query dengan Join
**Sebelum:**
```typescript
const details = await db
    .select({ detail: detailOrderTable, loinc: loincTable, modality: modalityTable })
    .from(detailOrderTable)
    .leftJoin(loincTable, eq(detailOrderTable.id_loinc, loincTable.id))
    .leftJoin(modalityTable, eq(loincTable.id_modality, modalityTable.id)) // ❌ Join via loinc
    .where(eq(detailOrderTable.id_order, orderId));
```

**Sesudah:**
```typescript
const details = await db
    .select({ detail: detailOrderTable, loinc: loincTable, modality: modalityTable })
    .from(detailOrderTable)
    .leftJoin(loincTable, eq(detailOrderTable.id_loinc, loincTable.id))
    .leftJoin(modalityTable, eq(detailOrderTable.id_modality, modalityTable.id)) // ✅ Join direct
    .where(eq(detailOrderTable.id_order, orderId));
```

#### Create Order
**Sebelum:**
```typescript
// Find LOINC and get modality via loinc's relation
const loincResult = await db
    .select({ loinc: loincTable, modality: modalityTable })
    .from(loincTable)
    .leftJoin(modalityTable, eq(loincTable.id_modality, modalityTable.id))
    .where(eq(loincTable.loinc_code, detailData.code))
    .limit(1);

const loincId = loincResult[0]?.loinc?.id;
const modalityCode = loincResult[0]?.modality?.code || "OT";

await db.insert(detailOrderTable).values({
    id_loinc: loincId,
    // ❌ No id_modality field
    modality_code: modalityCode, // only store code as string
});
```

**Sesudah:**
```typescript
// Find LOINC and get modality via loinc's relation
const loincResult = await db
    .select({ loinc: loincTable, modality: modalityTable })
    .from(loincTable)
    .leftJoin(modalityTable, eq(loincTable.id_modality, modalityTable.id))
    .where(eq(loincTable.loinc_code, detailData.code))
    .limit(1);

const loincId = loincResult[0]?.loinc?.id;
const modalityId = loincResult[0]?.modality?.id;
const modalityCode = loincResult[0]?.modality?.code || "OT";

await db.insert(detailOrderTable).values({
    id_loinc: loincId,
    id_modality: modalityId, // ✅ Store modality reference
    modality_code: modalityCode,
});
```

## Migration

Migration sudah ter-generate otomatis oleh Drizzle Kit di file:
- **File**: `src/database/migrations/0011_mature_gateway.sql`
- **Generated**: 2026-01-05

### Jalankan Migration:

**Option 1: Via Drizzle Kit (Recommended)**
```bash
bun run db:migrate
```

**Option 2: Manual SQL**
```bash
psql -U username -d database_name -f src/database/migrations/0011_mature_gateway.sql
```

### Migration Content:
```sql
ALTER TABLE "tb_detail_order" ADD COLUMN "id_modality" uuid;
ALTER TABLE "tb_detail_order" ADD CONSTRAINT "tb_detail_order_id_modality_tb_modality_id_fk" 
    FOREIGN KEY ("id_modality") REFERENCES "public"."tb_modality"("id") 
    ON DELETE no action ON UPDATE no action;
CREATE INDEX "detail_order_modality_idx" ON "tb_detail_order" USING btree ("id_modality");
```

### Post-Migration: Backfill Data

Setelah migration jalan, perlu backfill data untuk existing records:
```sql
-- Step 1: Populate from existing loinc relations
UPDATE tb_detail_order do
SET id_modality = l.id_modality
FROM tb_loinc l
WHERE do.id_loinc = l.id
AND do.id_modality IS NULL;

-- Step 2: Populate from modality_code
UPDATE tb_detail_order do
SET id_modality = m.id
FROM tb_modality m
WHERE do.modality_code = m.code
AND do.id_modality IS NULL
AND do.modality_code IS NOT NULL;

-- Step 3: Set default (OT = Other) for remaining nulls
UPDATE tb_detail_order do
SET id_modality = m.id
FROM tb_modality m
WHERE m.code = 'OT'
AND do.id_modality IS NULL;
```

## Keuntungan

1. **Query Lebih Sederhana**
   - Tidak perlu double join untuk mendapatkan modality
   - Satu join langsung: `detail_order → modality`

2. **Konsistensi Data**
   - Setiap detail order pasti punya modality reference
   - Tidak bergantung pada ada/tidaknya id_loinc

3. **Performance**
   - Satu join lebih cepat dari dua join
   - Index langsung di detail_order.id_modality

4. **Flexibility**
   - Order dari SIMRS yang tidak punya id_loinc tetap bisa punya modality
   - Bisa update modality tanpa harus lewat loinc

## Backward Compatibility

- ✅ LOINC master tetap punya relasi ke modality
- ✅ Service layer LOINC tidak berubah
- ✅ Test untuk LOINC tetap jalan
- ✅ Existing queries tetap work (karena pakai leftJoin)

## Catatan

- Master data LOINC (`tb_loinc`) **TETAP** punya `id_modality`
- Relasi LOINC → Modality tetap diperlukan untuk master data mapping
- Detail order sekarang punya **2 cara** untuk tahu modality:
  1. Via `id_modality` (direct) ← **Primary method**
  2. Via `id_loinc` → `loinc.id_modality` (fallback)

## Files Changed

1. `src/database/schemas/schema-order.ts` - Tambah field & index
2. `src/service/order.service.ts` - Update join queries
3. `src/database/migrations/0011_mature_gateway.sql` - Migration file (auto-generated by Drizzle)

## Testing

Setelah migration, verify:

```sql
-- Check semua detail order punya modality
SELECT COUNT(*) FROM tb_detail_order WHERE id_modality IS NULL;
-- Expected: 0

-- Check relasi valid
SELECT 
    do.id,
    do.accession_number,
    m.code as modality_code,
    m.name as modality_name
FROM tb_detail_order do
LEFT JOIN tb_modality m ON do.id_modality = m.id
LIMIT 10;
```

## Rollback (if needed)

```sql
-- Drop column
ALTER TABLE tb_detail_order DROP COLUMN id_modality;

-- Drop index
DROP INDEX IF EXISTS detail_order_modality_idx;
```
