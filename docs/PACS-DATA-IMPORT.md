# PACS Data Import - Dokumentasi

## 📊 Data Yang Tersedia di PACS (Orthanc)

Script analisis telah menemukan **172 DICOM tags** yang tersedia di PACS, dengan 10 studies yang dianalisis.

### 1. **Study-Level Tags** (Informasi Pemeriksaan)
Data utama yang tersedia:
- ✅ **AccessionNumber**: Nomor akses pemeriksaan (contoh: "2", "A-00000001", "CXR-20251221-0002")
- ✅ **StudyID**: ID Study (contoh: "2", "3")
- ✅ **StudyInstanceUID**: UID unik study
- ✅ **StudyDate**: Tanggal pemeriksaan (format: YYYYMMDD)
- ✅ **StudyTime**: Waktu pemeriksaan (format: HHMMSS)
- ✅ **StudyDescription**: Deskripsi pemeriksaan (contoh: "Lower Extremity^Knee")
- ✅ **RequestedProcedureDescription**: Prosedur yang diminta (contoh: "KNEE WO LT")
- ⚠️  **InstitutionName**: Nama institusi (contoh: "RS Pertamina Bintang Amin")
- ❌ **ReferringPhysicianName**: Nama dokter perujuk (KOSONG di sebagian besar data)

### 2. **Patient-Level Tags** (Informasi Pasien)
Data pasien yang tersedia:
- ✅ **PatientID**: ID/MRN Pasien (contoh: "24759123", "RM000123")
- ✅ **PatientName**: Nama pasien dalam format DICOM (contoh: "Doe^Harry", "BUDI^SANTOSO")
- ✅ **PatientSex**: Jenis kelamin (M/F)
- ✅ **PatientBirthDate**: Tanggal lahir (format: YYYYMMDD)
- ⚠️  **PatientAge**: Umur pasien (contoh: "054Y")
- ⚠️  **PatientWeight**: Berat badan pasien (contoh: "81.72")

### 3. **Series-Level Tags** (Informasi Series/Modalitas)
Data series dari study:
- ✅ **Modality**: Modalitas pemeriksaan (MR, CT, DX, CR, dll)
- ✅ **SeriesDescription**: Deskripsi series (contoh: "t2 tse ax")
- ✅ **SeriesNumber**: Nomor series
- ✅ **BodyPartExamined**: Bagian tubuh yang diperiksa (contoh: "CHEST")
- ✅ **ProtocolName**: Nama protokol
- ✅ **Manufacturer**: Pembuat alat (contoh: "SIEMENS")
- ✅ **StationName**: Nama station (contoh: "AccuVueMED")
- ✅ **PerformedProcedureStepDescription**: Deskripsi prosedur yang dilakukan
- ⚠️  **OperatorsName**: Nama operator (contoh: "Operators^Name")

### 4. **Instance-Level Tags** (Detail DICOM)
Tags penting untuk RIS:
- ✅ **RequestedProcedureCodeSequence**: Kode prosedur (LOINC/Local code)
  ```json
  [{"CodeValue":"35344","CodingSchemeDesignator":"99DRSYS3"}]
  ```
- ✅ **ProcedureCodeSequence**: Kode prosedur yang sama
- ✅ **RequestAttributesSequence**: Atribut permintaan
  ```json
  [{
    "RequestedProcedureID":"RP-00000001",
    "ScheduledProcedureStepDescription":"Chest X-Ray",
    "ScheduledProcedureStepID":"PROC001"
  }]
  ```
- ✅ **OperatorsName**: Nama operator
- ✅ **PerformingPhysicianName**: Nama dokter yang melakukan
- ⚠️  **ImageComments**: Komentar gambar (contoh: "Left")

## 🎯 Mapping ke Database RIS

### **ORDER Table** (tb_order)
| Database Field | PACS Source | Status | Notes |
|---|---|---|---|
| `patient_name` | PatientName | ✅ Mapped | Format: "LAST^FIRST" → "FIRST LAST" |
| `patient_mrn` | PatientID | ✅ Mapped | |
| `patient_birth_date` | PatientBirthDate | ✅ Mapped | Format: YYYYMMDD → YYYY-MM-DD |
| `patient_age` | (calculated) | ✅ Mapped | Dihitung dari birth_date |
| `patient_gender` | PatientSex | ✅ Mapped | M→L, F→P |
| `id_patient` | - | ❌ NULL | Perlu lookup/create patient |
| `id_practitioner` | - | ❌ NULL | Perlu mapping dokter |
| `id_created_by` | - | ❌ NULL | Perlu user yang menjalankan |
| `id_encounter_ss` | - | ❌ NULL | Untuk SatuSehat |
| `id_pelayanan` | - | ❌ NULL | untuk internal |

### **DETAIL_ORDER Table** (tb_detail_order)
| Database Field | PACS Source | Status | Notes |
|---|---|---|---|
| `accession_number` | AccessionNumber | ✅ Mapped | **KEY FIELD** - UNIQUE |
| `order_number` | StudyID | ✅ Mapped | |
| `schedule_date` | StudyDate | ✅ Mapped | |
| `notes` | StudyDescription | ✅ Mapped | |
| `pacs_study_url` | (generated) | ✅ Mapped | `http://IP:PORT/studies/{ID}` |
| `id_order` | - | ✅ Mapped | FK ke order yang baru dibuat |
| `id_loinc` | - | ❌ NULL | Perlu mapping LOINC code |
| `id_modality` | Modality | ⚠️  TODO | Perlu lookup modality table |
| `id_requester` | - | ❌ NULL | Dokter perujuk |
| `id_performer` | OperatorsName | ⚠️  TODO | Perlu mapping radiographer |
| `order_priority` | - | ✅ Default | "ROUTINE" |
| `order_status` | - | ✅ Default | "IN_REQUEST" |
| `order_from` | - | ✅ Default | "INTERNAL" |
| `ae_title` | - | ❌ NULL | - |
| `diagnosis_code` | - | ❌ NULL | - |
| `diagnosis_display` | - | ❌ NULL | - |
| `observation_notes` | - | ❌ NULL | - |
| `diagnostic_conclusion` | - | ❌ NULL | - |
| `service_request_json` | - | ❌ NULL | - |

## 📝 Script Yang Sudah Dibuat

### 1. **`orthanc-get-studies.ts`**
Script untuk melihat semua data studies dari PACS.

**Usage:**
```bash
# Lihat semua studies
bun run scripts/orthanc-get-studies.ts

# Lihat 5 studies pertama dengan detail
bun run scripts/orthanc-get-studies.ts --limit=5 --detailed

# Cari berdasarkan Accession Number
bun run scripts/orthanc-get-studies.ts --search=ACC20251224008 --detailed
```

### 2. **`pacs-data-analysis.ts`**
Script untuk menganalisis data apa saja yang tersedia di PACS.

**Usage:**
```bash
# Analisis 10 studies
bun run scripts/pacs-data-analysis.ts --limit=10
```

**Output:** File `pacs-data-analysis.json` berisi semua DICOM tags yang ditemukan.

### 3. **`pacs-to-database.ts`** ⭐
Script utama untuk import data dari PACS ke database.

**Usage:**
```bash
# Test mode (tidak insert ke database)
bun run scripts/pacs-to-database.ts --dry-run --limit=5 --verbose

# Import 10 studies pertama
bun run scripts/pacs-to-database.ts --limit=10

# Import semua studies
bun run scripts/pacs-to-database.ts
```

**Fitur:**
- ✅ Dry-run mode untuk testing
- ✅ Verbose mode untuk debug
- ✅ Limit untuk kontrol jumlah import
- ✅ Transaction-safe (rollback jika error)
- ✅ Skip studies tanpa Accession Number
- ✅ Progress indicator
- ✅ Summary report

## 🚀 Langkah Import Data

### Step 1: Test dengan Dry Run
```bash
bun run scripts/pacs-to-database.ts --dry-run --limit=5 --verbose
```

### Step 2: Import Data Kecil
```bash
bun run scripts/pacs-to-database.ts --limit=10 --verbose
```

### Step 3: Verifikasi Data di Database
```sql
-- Cek jumlah order yang berhasil diimport
SELECT COUNT(*) FROM tb_order;

-- Cek detail order
SELECT 
    do.accession_number,
    do.order_number,
    o.patient_name,
    o.patient_mrn,
    do.schedule_date
FROM tb_detail_order do
JOIN tb_order o ON o.id = do.id_order
ORDER BY do.created_at DESC
LIMIT 10;
```

### Step 4: Import Semua Data (HATI-HATI!)
```bash
bun run scripts/pacs-to-database.ts
```

## ⚠️ Catatan Penting

### 1. **Data yang Masih Kosong (NULL)**
Field-field berikut akan kosong dan perlu diisi kemudian:
- `id_patient` - Perlu dibuat relasi dengan patient table
- `id_practitioner` - Perlu mapping dokter
- `id_loinc` - Perlu mapping LOINC code
- `id_modality` - Perlu mapping modality table
- `id_requester` - Dokter perujuk
- `id_performer` - Radiographer/operator

### 2. **Duplikasi Data**
- Script akan **error** jika Accession Number sudah ada (karena UNIQUE constraint)
- Pastikan tidak menjalankan import 2x untuk data yang sama
- Untuk re-import, hapus data lama terlebih dahulu

### 3. **Missing Accession Number**
- Studies tanpa Accession Number akan di-skip
- Log akan menunjukkan "No Accession Number found"

## 🔧 Pengembangan Selanjutnya

### TODO: Mapping Modality
```typescript
// Tambahkan lookup modality table
const modalityLookup = await db.select()
    .from(modalityTable)
    .where(eq(modalityTable.code, modalityCode));
```

### TODO: Mapping LOINC Code
```typescript
// Parse ProcedureCodeSequence dan cari di LOINC table
const loincCode = fullTags.RequestedProcedureCodeSequence?.[0]?.CodeValue;
const loincLookup = await db.select()
    .from(loincTable)
    .where(eq(loincTable.code, loincCode));
```

### TODO: Create/Link Patient
```typescript
// Cek apakah patient sudah ada, jika tidak create
const existingPatient = await db.select()
    .from(patientTable)
    .where(eq(patientTable.mrn, patientMRN));
```

## 📊 Statistik Data PACS

Berdasarkan analisis terhadap 10 studies:
- **Total Studies di PACS**: 512 studies
- **Total DICOM Tags**: 172 unique tags
- **Study Tags**: 9 tags
- **Patient Tags**: 5 tags
- **Series Tags**: 15 tags
- **Instance Tags**: 143 tags

## 🎯 Data Quality

| Field | Ketersediaan | Kualitas |
|---|---|---|
| AccessionNumber | 100% | ✅ Excellent |
| PatientName | 100% | ✅ Excellent |
| PatientID | 100% | ✅ Excellent |
| PatientBirthDate | ~60% | ⚠️  Fair |
| PatientSex | ~80% | ✅ Good |
| Modality | 100% | ✅ Excellent |
| StudyDate | 100% | ✅ Excellent |
| ReferringPhysician | ~10% | ❌ Poor |
| OperatorsName | ~20% | ❌ Poor |

---

**Last Updated**: 2026-01-14  
**Author**: AI Assistant  
**Version**: 1.0
