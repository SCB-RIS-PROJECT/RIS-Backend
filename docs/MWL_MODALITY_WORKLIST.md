# MWL (Modality Worklist) - Penjelasan Lengkap

## 🏥 Apa itu MWL?

**MWL (Modality Worklist)** adalah standar **DICOM** untuk mengirim daftar pemeriksaan radiologi ke **modality** (mesin X-Ray, CT Scan, MRI, dll).

### Analogi Sederhana:
Bayangkan MWL seperti **"Antrian pasien digital"** yang bisa dilihat oleh mesin radiologi:
- 📋 RIS (Radiology Information System) → Buat daftar pemeriksaan
- 📤 RIS kirim ke **MWL Server**
- 🖥️ Mesin Radiologi (CT/MRI/X-Ray) → Query ke MWL Server
- 📥 Mesin dapat daftar pasien yang harus diperiksa hari ini

---

## 🔄 Flow MWL dalam Praktik

```
┌─────────────┐         ┌─────────────┐         ┌──────────────┐
│   SIMRS     │──order─→│  RIS (API)  │──push─→│ MWL Server   │
│ (Hospital)  │         │  (Your API) │         │ (Orthanc)    │
└─────────────┘         └─────────────┘         └──────────────┘
                                                        │
                                                        │ C-FIND
                                                        ↓
                                                 ┌──────────────┐
                                                 │  Modality    │
                                                 │  (CT/MRI/XR) │
                                                 └──────────────┘
```

1. **SIMRS** kirim order pemeriksaan ke **RIS API** (your backend)
2. **RIS API** simpan order ke database
3. **RIS API** push worklist item ke **MWL Server** (Orthanc)
4. **Modality** query MWL Server dengan **DICOM C-FIND**
5. Modality dapat list pasien yang harus diperiksa

---

## 📊 Data yang Dikirim ke MWL

### DICOM Worklist Tags (Wajib)

| DICOM Tag | Name | Description | Example |
|-----------|------|-------------|---------|
| `(0010,0010)` | PatientName | Nama pasien (format DICOM) | `SANTOSO^BUDI` |
| `(0010,0020)` | PatientID | ID Pasien (biasa MRN) | `MR202312230001` |
| `(0010,0030)` | PatientBirthDate | Tanggal lahir (YYYYMMDD) | `19850515` |
| `(0010,0040)` | PatientSex | Jenis kelamin | `M` atau `F` |
| `(0008,0050)` | AccessionNumber | Nomor Akses (PENTING!) | `20231223-0001` |
| `(0032,1060)` | RequestedProcedureDescription | Deskripsi pemeriksaan | `XR Chest PA upright` |
| `(0040,0100)` | ScheduledProcedureStepSequence | Jadwal pemeriksaan | (sequence) |

### ScheduledProcedureStepSequence (Nested)

| DICOM Tag | Name | Example |
|-----------|------|---------|
| `(0008,0060)` | Modality | `CT`, `MR`, `CR`, `DX` |
| `(0040,0001)` | ScheduledStationAETitle | `XRAY01` |
| `(0040,0002)` | ScheduledProcedureStepStartDate | `20231224` |
| `(0040,0003)` | ScheduledProcedureStepStartTime | `083000` |
| `(0040,0009)` | ScheduledProcedureStepID | `SPS001` |
| `(0040,0007)` | ScheduledProcedureStepDescription | `Chest X-Ray` |

---

## 💻 Implementasi: Push Order ke MWL (Orthanc)

Saya akan buat service untuk push order ke Orthanc MWL:

### File: `src/lib/orthanc-mwl.ts`

```typescript
import env from "@/config/env";

const ORTHANC_URL = env.ORTHANC_URL ?? "http://localhost";
const ORTHANC_HTTP_PORT = env.ORTHANC_HTTP_PORT ?? "8042";
const ORTHANC_USERNAME = env.ORTHANC_USERNAME ?? "orthanc";
const ORTHANC_PASSWORD = env.ORTHANC_PASSWORD ?? "orthanc";
const ORTHANC_BASE_URL = `${ORTHANC_URL}:${ORTHANC_HTTP_PORT}`;
const ORTHANC_AUTH_HEADER = "Basic " + btoa(`${ORTHANC_USERNAME}:${ORTHANC_PASSWORD}`);

export interface MWLWorklistItem {
    // Patient Info
    patientId: string;           // PatientID / MRN
    patientName: string;         // Nama lengkap
    patientBirthDate: string;    // YYYY-MM-DD
    patientSex: "M" | "F" | "O";
    
    // Procedure Info
    accessionNumber: string;     // PENTING: Unique identifier
    requestedProcedure: string;  // Deskripsi pemeriksaan
    
    // Scheduled Step
    modality: string;            // CT, MR, CR, DX, etc
    stationAETitle: string;      // AE Title modality
    scheduledDate: Date;         // Jadwal pemeriksaan
    scheduledStepId: string;     // ID step
    scheduledStepDescription: string;
    
    // Optional: Referring Physician
    referringPhysician?: string;
    
    // Optional: Study Instance UID (auto-generate if empty)
    studyInstanceUID?: string;
}

/**
 * Convert JavaScript Date to DICOM Date (YYYYMMDD)
 */
export function toDicomDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}${month}${day}`;
}

/**
 * Convert JavaScript Date to DICOM Time (HHMMSS)
 */
export function toDicomTime(date: Date): string {
    const hours = `${date.getHours()}`.padStart(2, "0");
    const minutes = `${date.getMinutes()}`.padStart(2, "0");
    const seconds = `${date.getSeconds()}`.padStart(2, "0");
    return `${hours}${minutes}${seconds}`;
}

/**
 * Convert name to DICOM Person Name format (FAMILY^GIVEN^MIDDLE)
 */
export function toDicomPersonName(name: string): string {
    // Simple: replace spaces with ^
    return name.trim().replace(/\s+/g, "^");
}

/**
 * Generate DICOM UID
 */
export function generateDicomUID(root: string = "1.2.826.0.1.3680043.8.498"): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1_000_000);
    return `${root}.${timestamp}.${random}`;
}

/**
 * Push worklist item ke Orthanc MWL
 */
export async function pushWorklistToOrthanc(item: MWLWorklistItem): Promise<{
    success: boolean;
    instanceId?: string;
    error?: string;
}> {
    try {
        const dicomDate = toDicomDate(item.scheduledDate);
        const dicomTime = toDicomTime(item.scheduledDate);
        const dicomBirthDate = item.patientBirthDate.replace(/-/g, ""); // YYYYMMDD
        const dicomPatientName = toDicomPersonName(item.patientName);
        const studyUID = item.studyInstanceUID || generateDicomUID();

        // Create DICOM Worklist using Orthanc's /tools/create-dicom
        const body = {
            Tags: {
                // Patient Module
                PatientName: dicomPatientName,
                PatientID: item.patientId,
                PatientBirthDate: dicomBirthDate,
                PatientSex: item.patientSex,

                // Study Module
                StudyInstanceUID: studyUID,
                AccessionNumber: item.accessionNumber,
                ReferringPhysicianName: item.referringPhysician || "",

                // Requested Procedure Module
                RequestedProcedureDescription: item.requestedProcedure,
                RequestedProcedureID: item.accessionNumber,

                // Scheduled Procedure Step Sequence
                ScheduledProcedureStepSequence: [
                    {
                        Modality: item.modality,
                        ScheduledStationAETitle: item.stationAETitle,
                        ScheduledProcedureStepStartDate: dicomDate,
                        ScheduledProcedureStepStartTime: dicomTime,
                        ScheduledProcedureStepID: item.scheduledStepId,
                        ScheduledProcedureStepDescription: item.scheduledStepDescription,
                        ScheduledPerformingPhysicianName: item.referringPhysician || "",
                        ScheduledProcedureStepStatus: "SCHEDULED",
                    },
                ],

                // Worklist specific
                SpecificCharacterSet: "ISO_IR 192", // UTF-8
            },
        };

        console.log("[MWL] Pushing worklist to Orthanc:", item.accessionNumber);

        const response = await fetch(`${ORTHANC_BASE_URL}/tools/create-dicom`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: ORTHANC_AUTH_HEADER,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[MWL] Orthanc error:", errorText);
            return {
                success: false,
                error: `Orthanc error: ${response.status} - ${errorText}`,
            };
        }

        const result = await response.json();
        const instanceId = result.ID || result.InstanceId;

        console.log("[MWL] Worklist pushed successfully. Instance ID:", instanceId);

        return {
            success: true,
            instanceId,
        };
    } catch (error) {
        console.error("[MWL] Error pushing worklist:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
```

---

## 🎯 Contoh Data Dummy untuk Test

### 1. Data Order dari Database RIS

Misalnya setelah SIMRS create order, data di RIS:

```json
{
    "id_order": "823825f1-6649-436e-a7c3-ff2c7bbb3148",
    "order_number": "ORD-20251223-0008",
    "id_patient": "d09d79a6-b8c0-41d6-92c6-f3ccc23dc1e4",
    "patient_name": "Budi Santoso",
    "patient_mrn": "MR202312230001",
    "patient_birth_date": "1985-05-15",
    "patient_gender": "MALE",
    "id_practitioner": "719cb8c4-dd23-424c-9add-5c9f4d4b60bf",
    "details": [{
        "accession_number": "20231223-0001",
        "schedule_date": "2023-12-24T08:30:00Z",
        "loinc": {
            "loinc_display": "XR Chest PA upright",
            "modality": {
                "code": "DX"
            }
        },
        "ae_title": "XRAY01"
    }]
}
```

### 2. Convert ke MWL Format

```typescript
// Example: Auto-push ke MWL setelah order created
import { pushWorklistToOrthanc } from "@/lib/orthanc-mwl";

async function pushOrderToMWL(order: any, detail: any) {
    const mwlItem = {
        // Patient
        patientId: order.patient_mrn,
        patientName: order.patient_name,
        patientBirthDate: order.patient_birth_date,
        patientSex: order.patient_gender === "MALE" ? "M" : "F",
        
        // Procedure
        accessionNumber: detail.accession_number,
        requestedProcedure: detail.loinc.loinc_display,
        
        // Schedule
        modality: detail.loinc.modality.code,
        stationAETitle: detail.ae_title || "UNKNOWN",
        scheduledDate: new Date(detail.schedule_date),
        scheduledStepId: `SPS-${detail.accession_number}`,
        scheduledStepDescription: detail.loinc.loinc_display,
        
        // Referring Physician
        referringPhysician: order.practitioner?.name,
    };
    
    const result = await pushWorklistToOrthanc(mwlItem);
    return result;
}
```

### 3. Request Test Manual (curl)

```bash
curl -X POST http://localhost:8042/tools/create-dicom \
  -u orthanc:orthanc \
  -H "Content-Type: application/json" \
  -d '{
    "Tags": {
        "PatientName": "SANTOSO^BUDI",
        "PatientID": "MR202312230001",
        "PatientBirthDate": "19850515",
        "PatientSex": "M",
        "AccessionNumber": "20231223-0001",
        "RequestedProcedureDescription": "XR Chest PA upright",
        "ScheduledProcedureStepSequence": [{
            "Modality": "DX",
            "ScheduledStationAETitle": "XRAY01",
            "ScheduledProcedureStepStartDate": "20231224",
            "ScheduledProcedureStepStartTime": "083000",
            "ScheduledProcedureStepID": "SPS001",
            "ScheduledProcedureStepDescription": "Chest X-Ray"
        }]
    }
}'
```

---

## ❓ Apakah Bisa Terima Data dari MWL Server yang Sudah Ada?

### ✅ BISA, tapi tergantung setup:

**Scenario 1: Orthanc sebagai MWL Server (Yang kita buat)**
- ✅ **Kita PUSH data** ke Orthanc via REST API
- ✅ Modality **QUERY** dari Orthanc via DICOM C-FIND
- ✅ Full control, mudah integrate dengan RIS

**Scenario 2: MWL Server Eksternal (Sudah ada)**
- ❓ **Tergantung**: Apakah MWL server itu punya REST API?
- ✅ Jika ya: Kita bisa push data via HTTP
- ❌ Jika tidak: Harus pakai DICOM protocol (C-STORE worklist)

**Scenario 3: Modality Langsung Query ke RIS**
- ⚠️ **Tidak disarankan**: Modality expect DICOM protocol, bukan HTTP/REST
- ✅ **Solusi**: Pakai Orthanc sebagai DICOM gateway

---

## 🛠️ Opsi Implementasi

### Opsi 1: Orthanc sebagai MWL Server (REKOMENDASI)

```
RIS API → Push via REST → Orthanc → Modality query via DICOM C-FIND
```

**Keuntungan:**
- ✅ Mudah integrate (REST API)
- ✅ Orthanc handle DICOM protocol
- ✅ Free & open source
- ✅ Sudah ada docker-compose

**Setup:**
1. Orthanc sudah running di `docker-compose.yml`
2. Tambahkan plugin worklist di Orthanc
3. Push data dari RIS ke Orthanc

### Opsi 2: Buat MWL Server Sendiri

```
RIS API → Custom MWL Server → Modality query via DICOM
```

**Kelemahan:**
- ❌ Harus implement DICOM protocol from scratch
- ❌ Kompleks (library: dcm4che, pydicom, dll)
- ❌ Butuh waktu development lama

**Kapan pakai:**
- Kalau butuh custom logic yang sangat spesifik
- Kalau Orthanc tidak cukup fleksibel

---

## 📝 Action Items

1. **Test Orthanc MWL Plugin**
   - Check apakah Orthanc punya worklist plugin enabled
   - Test query dari modality simulator

2. **Integrate dengan Order Service**
   - Auto-push ke MWL setelah order created
   - Update MWL saat order di-reschedule

3. **Test dengan Modality Real/Simulator**
   - Pakai DICOM Viewer (OsiriX, Horos, etc)
   - Test C-FIND query ke Orthanc

---

## 🔗 Resources

- [Orthanc Worklist Plugin](https://book.orthanc-server.com/plugins/worklists.html)
- [DICOM Worklist Standard](https://dicom.nema.org/medical/dicom/current/output/html/part04.html#chapter_K)
- [dcm4che Worklist SCP](https://github.com/dcm4che/dcm4che)

---

**Kesimpulan:**
- Pakai **Orthanc** sebagai MWL server (paling praktis)
- Push data dari RIS API ke Orthanc via REST
- Modality query dari Orthanc via DICOM C-FIND
