# DCM4CHEE MWL Integration Guide

## 📋 Server Information

- **Host**: `192.168.250.205` (mwl.rsba.co.id)
- **DICOM Port**: `11112` (default DCM4CHEE)
- **WildFly Port**: `8080` (application server)
- **Web UI**: `http://192.168.250.205:8080/dcm4chee-arc/ui2`
- **Default Login**: `admin / changeit` (or `root / changeit`)
- **SSH**: root@192.168.250.205 (Kucing123)
- **Default AE Title**: `DCM4CHEE`

> **Note**: Port 8080 adalah WildFly application server. DCM4CHEE Arc Light UI ada di path `/dcm4chee-arc/ui2`.

## 🚀 Push MWL ke DCM4CHEE

Ada 3 cara untuk push MWL item ke DCM4CHEE:

### 1. Via REST API (DCM4CHEE Arc Light)

DCM4CHEE Arc Light menyediakan REST API untuk MWL management:

**Endpoint**: `http://192.168.250.205:8080/dcm4chee-arc/aets/DCM4CHEE/rs/mwlitems`

**Create MWL Item**:
  -H "Content-Type: application/dicom+json" \
  -d '{
    "00080050": {"vr": "SH", "Value": ["ACC123"]},
    "00100020": {"vr": "LO", "Value": ["MR123"]},
    "00100010": {"vr": "PN", "Value": [{"Alphabetic": "Doe^John"}]},
    "00400100": {
      "vr": "SQ",
      "Value": [{
        "00080060": {"vr": "CS", "Value": ["CT"]},
        "00400002": {"vr": "DA", "Value": ["20231224"]}
      }]
    }
  }'
```

### 2. Via DICOM C-STORE (menggunakan DCMTK)

**Prerequisite**: Install DCMTK tools
- Windows: Download dari https://dicom.offis.de/dcmtk
- Linux: `apt-get install dcmtk`

**Steps**:

1. Buat DICOM dump file (`mwl.dump`):
```
(0010,0020) LO [MR123]
(0010,0010) PN [Doe^John]
(0008,0050) SH [ACC123]
(0040,0100) SQ
  (fffe,e000) na
    (0008,0060) CS [CT]
    (0040,0002) DA [20231224]
  (fffe,e00d) na
(fffe,e0dd) na
```

2. Convert ke DICOM file:
```bash
dump2dcm mwl.dump mwl.dcm
```

3. Push ke DCM4CHEE:
```bash
storescu -aec DCM4CHEE -aet RIS_API 192.168.250.205 11112 mwl.dcm
```

### 3. Via File System (Copy ke MWL folder)

SSH ke server dan copy DICOM file ke MWL directory yang di-monitor DCM4CHEE:

```bash
ssh root@192.168.250.205
cp mwl.dcm /opt/dcm4chee/server/default/mwl/
# atau sesuai konfigurasi DCM4CHEE
```

## 🔍 Cara Cek MWL Item di DCM4CHEE

### 1. Via Web UI

1. Buka browser: `http://192.168.250.205:8080/dcm4chee-arc/ui2`
2. Login dengan credentials:
   - Username: `admin` atau `root`
   - Password: `changeit` (default DCM4CHEE Arc Light)
3. Navigate to:
   - **Study** tab → Click **Worklist** tab
   - Atau **Monitoring** → **Worklist**
4. Search by:
   - Accession Number
   - Patient ID / Name
   - Scheduled Date
   - Modality

> **Troubleshooting**: Jika muncul "Welcome to WildFly", tambahkan path `/dcm4chee-arc/ui2` ke URL.

### 2. Via DICOM C-FIND Query

Gunakan `findscu` dari DCMTK:

```bash
# Query semua MWL items
findscu -aec DCM4CHEE -aet RIS_API -W 192.168.250.205 11112

# Query by Accession Number
findscu -aec DCM4CHEE -aet RIS_API -W \
  -k "0008,0050=ACC123" \
  192.168.250.205 11112

# Query by Patient ID
findscu -aec DCM4CHEE -aet RIS_API -W \
  -k "0010,0020=MR123" \
  192.168.250.205 11112

# Query by Scheduled Date
findscu -aec DCM4CHEE -aet RIS_API -W \
  -k "0040,0100[0].0040,0002=20231224" \
  192.168.250.205 11112

# Query by Modality
findscu -aec DCM4CHEE -aet RIS_API -W \
  -k "0040,0100[0].0008,0060=CT" \
  192.168.250.205 11112
```

**Output Format**:
```
W: Find Response: 1 (Pending)
W: 
W: # Dicom-Data-Set
W: (0008,0050) SH [ACC123]               # Accession Number
W: (0010,0020) LO [MR123]                # Patient ID
W: (0010,0010) PN [Doe^John]             # Patient Name
W: (0040,0100) SQ (Sequence with explicit length)
W:   (fffe,e000) na (Item with explicit length)
W:     (0008,0060) CS [CT]               # Modality
W:     (0040,0002) DA [20231224]         # Scheduled Date
```

### 3. Via SSH - Check Logs

```bash
ssh root@192.168.250.205

# Check DCM4CHEE server logs
tail -f /opt/dcm4chee/server/default/log/server.log

# Check audit logs
tail -f /opt/dcm4chee/server/default/log/audit.log

# Grep untuk MWL related logs
grep -i "worklist" /opt/dcm4chee/server/default/log/server.log
grep -i "MWL" /opt/dcm4chee/server/default/log/server.log
```

### 4. Via SSH - Check Database

DCM4CHEE biasanya menggunakan PostgreSQL atau MySQL:

```bash
# Connect to PostgreSQL
psql -U dcm4chee -d pacsdb

# Query MWL items
SELECT * FROM mwl_item 
WHERE accession_no = 'ACC123';

# Query by patient
SELECT * FROM mwl_item 
WHERE pat_id = 'MR123';

# Query today's schedule
SELECT accession_no, pat_name, modality, sps_start_date 
FROM mwl_item 
WHERE sps_start_date = CURRENT_DATE
ORDER BY sps_start_time;
```

### 5. Via Modality (Real Device)

Configure modality device untuk query MWL:

**Settings**:
- Remote AE Title: `DCM4CHEE`
- Remote Host: `192.168.250.205`
- Remote Port: `11112`
- Query Type: `MWL` (Modality Worklist)
- Local AE Title: `MODALITY_01` (sesuai station)

**Query Flow**:
1. Di modality, pilih "Worklist Query" atau "MWL"
2. Enter search criteria (Patient ID, Accession Number, atau Date)
3. Modality akan kirim DICOM C-FIND ke DCM4CHEE
4. DCM4CHEE return matching worklist items
5. Pilih item yang sesuai untuk start examination

## 🧪 Test Script

Run test script yang sudah dibuat:

```bash
bun run scripts/test-mwl-dcm4chee.ts
```

Script ini akan:
1. ✅ Generate 3 dummy MWL items
2. ✅ Push via REST API (jika tersedia)
3. ✅ Push via DICOM C-STORE (fallback)
4. ✅ Query untuk verify
5. ✅ Show verification instructions

## 🔧 Troubleshooting

### Error: "Association Rejected"

**Masalah**: DCM4CHEE menolak koneksi DICOM

**Solusi**:
1. Check AE Title configuration di DCM4CHEE
2. Add `RIS_API` ke accepted AE Titles
3. Check firewall port 11112 open

```bash
# Via SSH, check DCM4CHEE config
ssh root@192.168.250.205
cd /opt/dcm4chee/server/default/conf
cat dcm4chee-ae/ae.xml
```

### Error: "Cannot connect to REST API"

**Masalah**: DCM4CHEE versi lama (tidak punya REST API)

**Solusi**: Use DICOM C-STORE method instead

### Error: "Unknown AE Title"

**Masalah**: `RIS_API` not configured in DCM4CHEE

**Solusi**: Add AE Title via web UI:
1. Login DCM4CHEE web UI
2. Configuration → Device/AE Configuration
3. Add new AE: `RIS_API`
4. Set accepted calling AE Titles

### MWL Item tidak muncul di Query

**Possible causes**:
1. MWL item belum di-commit ke database
2. Scheduled Date sudah lewat (some systems hide old items)
3. Wrong query keys

**Debug**:
```bash
# Check database directly
ssh root@192.168.250.205
psql -U dcm4chee -d pacsdb -c "SELECT COUNT(*) FROM mwl_item;"
```

## 📊 DICOM MWL Tags Reference

| Tag | Name | Type | Description |
|-----|------|------|-------------|
| (0008,0050) | AccessionNumber | SH | Unique accession number |
| (0010,0020) | PatientID | LO | Patient MRN |
| (0010,0010) | PatientName | PN | Patient name (LastName^FirstName) |
| (0010,0030) | PatientBirthDate | DA | YYYYMMDD |
| (0010,0040) | PatientSex | CS | M/F/O |
| (0008,0090) | ReferringPhysicianName | PN | Doctor name |
| (0032,1060) | RequestedProcedureDescription | LO | Procedure description |
| (0040,0100) | ScheduledProcedureStepSequence | SQ | **Sequence** |
| (0008,0060) | Modality | CS | CT/MR/DX/CR/US etc |
| (0040,0001) | ScheduledStationAETitle | AE | Modality AE Title |
| (0040,0002) | ScheduledProcedureStepStartDate | DA | YYYYMMDD |
| (0040,0003) | ScheduledProcedureStepStartTime | TM | HHMMSS |
| (0040,0009) | ScheduledProcedureStepID | SH | Step ID |
| (0040,0007) | ScheduledProcedureStepDescription | LO | Step description |

## 🔗 Integration dengan RIS API

Untuk integrate dengan order API yang sudah dibuat:

```typescript
// Di order.service.ts, tambahkan method untuk push ke DCM4CHEE
static async pushOrderToDcm4chee(orderId: string) {
    const order = await OrderService.getOrderById(orderId);
    
    for (const detail of order.details) {
        // Generate MWL item sesuai format DCM4CHEE
        const mwlItem = {
            accessionNumber: detail.accession_number,
            patientId: order.patient_mrn,
            patientName: order.patient_name,
            // ... etc
        };
        
        // Push via REST API atau DICOM C-STORE
        await pushToDcm4chee(mwlItem);
    }
}
```

## 📚 References

- [DCM4CHEE Documentation](https://dcm4che.atlassian.net/wiki/spaces/d2/overview)
- [DICOM Worklist Standard](https://dicom.nema.org/medical/dicom/current/output/chtml/part04/sect_K.6.html)
- [DCMTK Tools](https://support.dcmtk.org/docs/)
