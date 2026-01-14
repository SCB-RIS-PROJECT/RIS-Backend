# 🚀 PRODUCTION DEPLOYMENT GUIDE - PACS Data Import

## 📋 Checklist Sebelum Mulai

Pastikan Anda sudah:
- ✅ SSH access ke production server
- ✅ Code sudah di-push ke repository
- ✅ Database production sudah running
- ✅ PACS Orthanc accessible dari server production

---

## 🔐 STEP 1: SSH ke Production Server

```bash
ssh gufriends@45.80.181.4 -p 2221
# Password: ghufranaceh
```

---

## 📂 STEP 2: Masuk ke Directory Project

```bash
cd /path/to/RIS-BE  # Sesuaikan path
# atau
cd ~/RIS-BE
```

---

## 🔄 STEP 3: Pull Latest Code

```bash
git pull origin main
```

**Expected Output:**
```
Updating 3d4ffb5..28f2c5c
Fast-forward
 docs/MODALITY-MAPPING-GUIDE.md        | 345 ++++++++++++++++
 docs/PACS-DATA-IMPORT.md              | 289 +++++++++++++
 scripts/add-modalities.ts             |  52 +++
 scripts/check-import-result.ts        |  45 ++
 ...
 12 files changed, 2905 insertions(+)
```

---

## 📦 STEP 4: Install Dependencies (Jika Ada yang Baru)

```bash
bun install
```

---

## 🔧 STEP 5: Cek Koneksi ke PACS

Test apakah server bisa connect ke PACS Orthanc:

```bash
bun run scripts/orthanc-get-studies.ts --limit=1
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════════════════════════╗
║                 🏥 ORTHANC PACS - GET ALL STUDIES                          ║
╚════════════════════════════════════════════════════════════════════════════╝

📡 Using: Main ORTHANC
   URL      : http://192.168.251.202:8042
   Username : rsba
   Password : ****

📋 Fetching all study IDs from PACS...
✅ Found XXX studies
```

**❌ Jika Error:**
- Cek apakah IP PACS accessible dari production server
- Cek firewall/network rules
- Ping test: `ping 192.168.251.202`

---

## 🗄️ STEP 6: Cek Database Connection

```bash
# Cek apakah bisa connect ke database
bun run scripts/check-modality.ts
```

**Expected Output:**
```
[
  {
    "id": "df55e7e0-c275-498c-bf38-9ca34fd39fee",
    "code": "CR",
    "name": "X-Ray",
    ...
  }
]
```

**❌ Jika Error:**
- Cek DATABASE_URL di `.env`
- Cek apakah PostgreSQL running
- Test connection: `psql $DATABASE_URL -c "SELECT 1"`

---

## ➕ STEP 7: Tambah Modality yang Kurang (Jika Perlu)

Cek modality yang ada:
```bash
bun run scripts/check-modality.ts
```

Jika modality MR dan DX belum ada, tambahkan:
```bash
bun run scripts/add-modalities.ts
```

**Expected Output:**
```
Adding missing modalities...

✅ Added modality: MR - Magnetic Resonance
✅ Added modality: DX - Digital Radiography

✅ Done!
```

---

## 🧪 STEP 8: DRY RUN TEST (PENTING!)

**JANGAN SKIP STEP INI!** Test dulu dengan dry-run untuk memastikan tidak ada error:

```bash
bun run scripts/pacs-to-database.ts --dry-run --limit=5 --verbose
```

**Expected Output:**
```
⚙️  Configuration:
   PACS URL    : http://192.168.251.202:8042
   Mode        : 🔍 DRY RUN (no database changes)
   Limit       : 5
   Verbose     : YES

[1/5] Processing study: ...
   📋 Study Data:
      Accession Number: XXX
      Patient Name    : John Doe
      Modality        : CR (ID: df55e7e0...)
   ✅ [DRY RUN] Would insert Order + Detail Order for ACSN: XXX

...

📈 IMPORT SUMMARY
   Successful             : ✅ 5
   Failed                 : ❌ 0
   Mode                   : DRY RUN
```

**⚠️ Jika Ada Error:**
- Lihat error message detail
- Fix error sebelum lanjut ke step berikutnya
- Jangan lanjut jika masih ada error!

---

## ⚠️ STEP 9: BACKUP DATABASE (WAJIB!)

**SANGAT PENTING!** Backup dulu sebelum import data besar:

```bash
# Backup database production
pg_dump $DATABASE_URL > backup_before_pacs_import_$(date +%Y%m%d_%H%M%S).sql

# atau jika DATABASE_URL tidak dikenali
pg_dump "postgres://user:pass@host:port/dbname" > backup_before_pacs_import_$(date +%Y%m%d_%H%M%S).sql
```

**Verify backup exists:**
```bash
ls -lh backup_before_pacs_import_*.sql
```

---

## 🔍 STEP 10: Small Batch Test (10 Studies)

Test dengan data kecil dulu (10 studies):

```bash
bun run scripts/pacs-to-database.ts --limit=10 --verbose
```

**Expected Output:**
```
⚙️  Configuration:
   Mode        : 💾 LIVE IMPORT
   Limit       : 10
   
[1/10] Processing study: ...
   ✅ Inserted Order + Detail Order for ACSN: XXX

...

📈 IMPORT SUMMARY
   Successful             : ✅ 10
   Failed                 : ❌ 0
   Mode                   : LIVE IMPORT
```

---

## ✅ STEP 11: Verifikasi Small Batch

Cek apakah data masuk ke database:

```bash
bun run scripts/check-import-result.ts
```

**Expected Output:**
```
✅ Total Orders: 10
✅ Total Detail Orders: 10

📋 Sample Data (First 5 records):
1. ACSN: XXX
   Patient: John Doe (MR123)
   Date: ...
```

**Verify Modality Mapping:**
```bash
bun run scripts/verify-modality-mapping.ts
```

**Expected Output:**
```
📈 SUMMARY
Total Orders           : 10
With Modality Mapping  : 10 (100.00%)
Status                 : ✅ PERFECT!
```

---

## 🗑️ STEP 12: (Optional) Hapus Test Data

Jika test data di atas OK, hapus untuk mulai import full:

```bash
bun run scripts/delete-all-orders.ts
```

**Expected Output:**
```
📊 Current Data:
   Orders: 10
   Detail Orders: 10

🗑️  Deleting all data...
   ✅ Detail Orders deleted
   ✅ Orders deleted

📊 After Deletion:
   Orders: 0
   Detail Orders: 0
```

---

## 🚀 STEP 13: FULL IMPORT (PRODUCTION)

**FINAL STEP!** Import semua data dari PACS:

```bash
# Option 1: Import semua (recommended untuk first time)
bun run scripts/pacs-to-database.ts

# Option 2: Import dengan limit (jika mau bertahap)
bun run scripts/pacs-to-database.ts --limit=100
```

**Expected Duration:** 
- ~2-3 menit untuk 515 studies
- Progress akan ditampilkan real-time

**Expected Output:**
```
╔════════════════════════════════════════════════════════════════════════════╗
║             🏥 PACS TO DATABASE IMPORT SCRIPT                              ║
╚════════════════════════════════════════════════════════════════════════════╝

⚙️  Configuration:
   PACS URL    : http://192.168.251.202:8042
   Mode        : 💾 LIVE IMPORT
   Limit       : ALL studies

📋 Fetching all study IDs from PACS...
✅ Found 515 studies in PACS

📊 Starting import for 515 studies...
────────────────────────────────────────────────────────────────────────────────

[1/515] Processing study: ...
   ✅ Inserted Order + Detail Order for ACSN: XXX

[2/515] Processing study: ...
   ✅ Inserted Order + Detail Order for ACSN: XXX

...

[515/515] Processing study: ...
   ✅ Inserted Order + Detail Order for ACSN: XXX

================================================================================
📈 IMPORT SUMMARY
================================================================================
   Total Studies in PACS  : 515
   Studies Processed      : 515
   Successful             : ✅ 515
   Failed                 : ❌ 0
   Mode                   : LIVE IMPORT
================================================================================

✅ Script completed successfully!
```

---

## ✅ STEP 14: Final Verification

Verify semua data berhasil masuk:

### Check Total Data:
```bash
bun run scripts/check-import-result.ts
```

### Check Modality Mapping:
```bash
bun run scripts/verify-modality-mapping.ts
```

**Expected Final Results:**
```
📈 SUMMARY
Total Orders           : 515
With Modality Mapping  : 514 (99.81%)
Status                 : ⚠️  SOME MISSING (normal - 1 study tanpa modality)

📋 Distribution by Modality:
1. CR     - X-Ray                          : 508 orders
2. CT     - Computed Tomography            : 3 orders
3. DX     - Digital Radiography            : 2 orders
4. MR     - Magnetic Resonance             : 1 orders
5. NULL   - No Modality                    : 1 orders
```

---

## 📊 STEP 15: Database Query Verification

Login ke database dan verify:

```bash
psql $DATABASE_URL
```

```sql
-- Cek total orders
SELECT COUNT(*) FROM tb_order;
-- Expected: 515

-- Cek total detail orders
SELECT COUNT(*) FROM tb_detail_order;
-- Expected: 515

-- Cek orders dengan modality
SELECT 
    m.code,
    m.name,
    COUNT(*) as total
FROM tb_detail_order do
LEFT JOIN tb_modality m ON m.id = do.id_modality
GROUP BY m.code, m.name
ORDER BY total DESC;

-- Cek sample data
SELECT 
    do.accession_number,
    o.patient_name,
    o.patient_mrn,
    m.code as modality,
    do.order_status,
    do.schedule_date
FROM tb_detail_order do
JOIN tb_order o ON o.id = do.id_order
LEFT JOIN tb_modality m ON m.id = do.id_modality
LIMIT 10;
```

---

## 🔄 STEP 16: (Optional) Export to CSV

Jika ingin backup dalam bentuk CSV:

```bash
bun run scripts/pacs-export-csv.ts
```

Output files:
- `pacs_orders_2026-01-14.csv`
- `pacs_detail_orders_2026-01-14.csv`

---

## 📝 STEP 17: Documentation & Cleanup

1. **Catat hasil import:**
   - Jumlah data yang masuk
   - Timestamp import
   - Success/failure rate

2. **Keep backup files:**
   - Simpan backup database
   - Simpan CSV export (optional)

3. **Update README** (optional):
   ```bash
   echo "PACS Import completed: $(date)" >> IMPORT_LOG.md
   ```

---

## 🚨 TROUBLESHOOTING

### Problem 1: "Cannot find module"
```bash
# Solution: Install dependencies
bun install
```

### Problem 2: "Connection refused" ke PACS
```bash
# Solution: Check network & firewall
ping 192.168.251.202
curl http://192.168.251.202:8042/studies
```

### Problem 3: "Database connection error"
```bash
# Solution: Check DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

### Problem 4: "Modality not found"
```bash
# Solution: Add missing modalities
bun run scripts/add-modalities.ts
```

### Problem 5: Import terhenti di tengah jalan
```bash
# Solution: Cek error, lalu lanjutkan atau restart
# Data yang sudah masuk tidak akan di-duplicate (karena UNIQUE constraint di accession_number)
bun run scripts/pacs-to-database.ts --limit=SISANYA
```

---

## ⚡ QUICK REFERENCE

### Import Full Data (One Command):
```bash
# SSH → Pull → Import
ssh gufriends@45.80.181.4 -p 2221
cd /path/to/RIS-BE
git pull origin main
bun install
bun run scripts/pacs-to-database.ts
```

### Verify Import:
```bash
bun run scripts/check-import-result.ts
bun run scripts/verify-modality-mapping.ts
```

### Rollback (If Needed):
```bash
# Restore from backup
psql $DATABASE_URL < backup_before_pacs_import_YYYYMMDD_HHMMSS.sql
```

---

## ✅ SUCCESS CRITERIA

Import dianggap **SUKSES** jika:
1. ✅ Total orders = Total studies di PACS (~515)
2. ✅ Success rate = 100% atau >99%
3. ✅ Modality mapping >95%
4. ✅ Semua order_status = "FINAL"
5. ✅ Tidak ada error di database
6. ✅ Sample data query berhasil

---

## 📞 SUPPORT

Jika ada masalah:
1. Cek error message detail
2. Lihat documentation di `docs/PACS-DATA-IMPORT.md`
3. Cek `docs/MODALITY-MAPPING-GUIDE.md` untuk mapping issues

---

**Created**: 2026-01-14  
**Version**: 1.0  
**Last Updated**: 2026-01-14
