# RIS to DCM4CHEE MWL Export Script

Script untuk mengirim data order dari RIS database ke DCM4CHEE Modality Worklist (MWL).

## 📋 Deskripsi

Script ini akan:
1. Query data order dari database RIS (tabel `tb_order` dan `tb_detail_order`)
2. Transform data ke format DICOM MWL yang kompatibel dengan DCM4CHEE
3. Push data via DCM4CHEE REST API

## 🚀 Cara Penggunaan

### Basic Usage

```bash
# Export 10 order terbaru (default)
bun run scripts/ris-to-dcm4chee-mwl.ts

# Export dengan limit tertentu
bun run scripts/ris-to-dcm4chee-mwl.ts --limit=50

# Preview data tanpa mengirim (dry run)
bun run scripts/ris-to-dcm4chee-mwl.ts --dry-run
```

### Filter by Criteria

```bash
# Export order dengan accession number tertentu
bun run scripts/ris-to-dcm4chee-mwl.ts --accession=ACC20250115001

# Export order dengan ID tertentu
bun run scripts/ris-to-dcm4chee-mwl.ts --order-id=550e8400-e29b-41d4-a716-446655440000

# Export order dengan status tertentu
bun run scripts/ris-to-dcm4chee-mwl.ts --status=SCHEDULED,IN_REQUEST

# Export order dalam rentang tanggal
bun run scripts/ris-to-dcm4chee-mwl.ts --from-date=2025-01-15 --to-date=2025-01-20
```

### Combined Options

```bash
# Export 100 order dengan status SCHEDULED dalam bulan ini
bun run scripts/ris-to-dcm4chee-mwl.ts --limit=100 --status=SCHEDULED --from-date=2025-01-01

# Preview 5 order terbaru tanpa mengirim
bun run scripts/ris-to-dcm4chee-mwl.ts --limit=5 --dry-run
```

## ⚙️ Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--limit=N` | Batasi jumlah order yang dikirim | 10 | `--limit=50` |
| `--accession=ACC` | Filter berdasarkan accession number | - | `--accession=ACC001` |
| `--order-id=UUID` | Filter berdasarkan order ID | - | `--order-id=uuid-here` |
| `--status=STATUS` | Filter berdasarkan status (comma-separated) | IN_REQUEST,SCHEDULED | `--status=SCHEDULED` |
| `--from-date=DATE` | Filter order dari tanggal (YYYY-MM-DD) | - | `--from-date=2025-01-01` |
| `--to-date=DATE` | Filter order sampai tanggal (YYYY-MM-DD) | - | `--to-date=2025-01-31` |
| `--dry-run` | Preview data tanpa mengirim | false | `--dry-run` |

## 📊 Data Mapping

### Patient Information
| RIS Field | DCM4CHEE DICOM Tag | Description |
|-----------|-------------------|-------------|
| `patient.mrn` | (0010,0020) PatientID | Medical Record Number |
| `patient.name` | (0010,0010) PatientName | Nama pasien |
| `patient.birth_date` | (0010,0030) PatientBirthDate | Tanggal lahir (YYYYMMDD) |
| `patient.gender` | (0010,0040) PatientSex | M/F/O |
| `patient.address` | (0010,1040) PatientAddress | Alamat pasien (optional) |
| `patient.phone` | (0010,2154) PatientTelephoneNumbers | Nomor telepon (optional) |

### Procedure Information
| RIS Field | DCM4CHEE DICOM Tag | Description |
|-----------|-------------------|-------------|
| `detail_order.accession_number` | (0008,0050) AccessionNumber | Nomor aksesi unik |
| `loinc.long_common_name` | (0032,1060) RequestedProcedureDescription | Deskripsi prosedur |
| `practitioner.name` (requester) | (0008,0090) ReferringPhysicianName | Dokter perujuk |

### Scheduled Procedure Step
| RIS Field | DCM4CHEE DICOM Tag | Description |
|-----------|-------------------|-------------|
| `modality.code` | (0008,0060) Modality | CT, MR, CR, DX, US, etc |
| `modality.aet` atau `detail_order.ae_title` | (0040,0001) ScheduledStationAETitle | AE Title stasiun |
| `detail_order.schedule_date` | (0040,0002) ScheduledProcedureStepStartDate | Tanggal jadwal (YYYYMMDD) |
| `detail_order.schedule_date` | (0040,0003) ScheduledProcedureStepStartTime | Waktu jadwal (HHMMSS) |
| Auto-generated: `SPS-{accession}` | (0040,0009) ScheduledProcedureStepID | ID step |

## 🔍 Verifikasi

### 1. Via DCM4CHEE Web UI

1. Buka browser dan akses:
   ```
   http://192.168.101.208:8080/dcm4chee-arc/ui2
   ```

2. Login dengan credentials default (atau sesuai konfigurasi):
   - Username: `admin`
   - Password: `changeit` (atau sesuai `.env`)

3. Navigate ke: **Study → Worklist** tab

4. Search berdasarkan:
   - Patient Name
   - Accession Number
   - Scheduled Date
   - Modality

### 2. Via DICOM C-FIND Query (jika DCMTK terinstall)

```bash
# Query semua worklist
findscu -aec DCM4CHEE -aet RIS_API -W 192.168.101.208 11112

# Query berdasarkan accession number
findscu -aec DCM4CHEE -aet RIS_API -W \
  -k "0008,0050=ACC20250115001" \
  192.168.101.208 11112

# Query berdasarkan modality
findscu -aec DCM4CHEE -aet RIS_API -W \
  -k "0008,0060=CT" \
  192.168.101.208 11112
```

### 3. Via Modality Device (CT/MR/CR Scanner)

Configure modality untuk query MWL dari DCM4CHEE:

**Connection Settings:**
- **Remote AE Title**: `DCM4CHEE`
- **Remote Host**: `192.168.101.208`
- **Remote Port**: `11112` (DICOM port)
- **Local AE Title**: Sesuai dengan `ae_title` di database
- **Query Type**: MWL (Modality Worklist)

**Workflow:**
1. Pada modality, pilih "Worklist Query" atau "MWL"
2. Pilih tanggal atau filter lainnya
3. Query akan menampilkan daftar pemeriksaan yang dijadwalkan
4. Pilih patient/pemeriksaan untuk memulai akuisisi

## 📝 Output Example

```
╔════════════════════════════════════════════════════════════════════════════╗
║               📤 RIS to DCM4CHEE MWL Export Script                         ║
╚════════════════════════════════════════════════════════════════════════════╝

⚙️  Configuration:
   Source      : RIS Database (PostgreSQL)
   Destination : DCM4CHEE @ 192.168.101.208:8080
   Limit       : 10 orders
   Status      : IN_REQUEST, SCHEDULED

📋 Querying orders from RIS database...
✅ Found 10 orders in RIS database

════════════════════════════════════════════════════════════════════════════
🚀 Starting export of 10 orders to DCM4CHEE...
════════════════════════════════════════════════════════════════════════════

[1/10] Processing order...
├─ Order Number : ORD-2025-001
├─ Accession    : ACC20250115001
├─ Patient      : Ahmad Yani (MRN: MR001)
├─ Birth Date   : 1985-03-15
├─ Gender       : M
├─ Modality     : CT - Computed Tomography
├─ Procedure    : CT Thorax with Contrast
├─ Scheduled    : 2025-01-16T08:00:00.000Z
├─ Status       : SCHEDULED
├─ Priority     : ROUTINE
└─ Physician    : dr. Siti Rahma, Sp.PD
  👤 Creating patient via REST API...
  ✅ Patient created (or already exists)
  📡 Pushing MWL via REST API...
  ✅ MWL item created successfully!
  ✅ SUCCESS - MWL created in DCM4CHEE
     Study UID: 1.2.826.0.1.3680043.8.498.1736928000000.12345

...

════════════════════════════════════════════════════════════════════════════
📊 EXPORT SUMMARY
════════════════════════════════════════════════════════════════════════════
✅ Success  : 10 orders
❌ Failed   : 0 orders
📋 Total    : 10 orders
════════════════════════════════════════════════════════════════════════════

✅ Export completed successfully!
```

## 🐛 Troubleshooting

### Error: "Connection refused" atau "ECONNREFUSED"
- Pastikan DCM4CHEE server running
- Check IP dan port di file `.env`
- Test koneksi: `curl http://192.168.101.208:8080/dcm4chee-arc/aets`

### Error: "Patient creation failed: HTTP 400"
- Data patient tidak lengkap atau format salah
- Check patient birth date, gender, dll
- Gunakan `--dry-run` untuk preview data

### Error: "MWL creation failed: HTTP 409"
- MWL item dengan accession number yang sama sudah ada
- Hapus MWL lama atau gunakan accession number berbeda

### Data tidak muncul di worklist query
- Check scheduled date (MWL hanya muncul untuk tanggal tertentu)
- Verify modality code sesuai
- Check AE Title matching

## 📌 Notes

1. **Default Status Filter**: Script default hanya export order dengan status `IN_REQUEST` dan `SCHEDULED`. Gunakan `--status` untuk custom filter.

2. **AE Title Priority**: 
   - First: `detail_order.ae_title` (jika ada)
   - Second: `modality.aet[0]` (AET pertama dari array)
   - Third: `modality.code` (fallback)

3. **Procedure Description Priority**:
   - First: `loinc.long_common_name` (jika ada)
   - Second: `modality.name`
   - Third: `detail_order.notes`
   - Fourth: "Radiological Examination" (fallback)

4. **Study Instance UID**: Auto-generated oleh DCM4CHEE menggunakan format standar DICOM UID.

5. **Delay Between Requests**: Script menunggu 500ms antara setiap request untuk menghindari overload server.

## 🔗 Related Scripts

- `test-mwl-dcm4chee.ts` - Test push dummy MWL ke DCM4CHEE
- `test-mwl-push.ts` - Test push MWL ke Orthanc
- `test-push-order-to-mwl.ts` - Test integration order to MWL

## 📚 References

- [DCM4CHEE REST API Documentation](https://github.com/dcm4che/dcm4chee-arc-light/wiki/RESTful-services)
- [DICOM Standard - Modality Worklist](https://dicom.nema.org/medical/dicom/current/output/chtml/part04/chapter_K.html)
- [DCM4CHEE Installation Guide](https://github.com/dcm4che/dcm4chee-arc-light/wiki)
