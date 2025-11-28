// scripts/test-orthanc-dicom.ts
// Test sederhana:
// 1. Buat 1 DICOM dummy di Orthanc
// 2. Ambil Series/Study ID-nya (kalau ada)
// 3. Kirim ke DICOM Router SATUSEHAT (DicomModalityStore)
//
// Jalankan pakai:
//   bun run scripts/test-orthanc-dicom.ts

type PatientSex = "M" | "F" | "O";

interface DummyDicomInput {
    patientId: string;
    patientName: string; // DICOM format: FAMILY^GIVEN
    patientBirthDate: string; // YYYYMMDD
    patientSex: PatientSex;
    modality: string; // "CT" | "CR" | "MR" | etc
    description: string;
    stationAeTitle: string;
    scheduledStart: Date;
    accessionNumber?: string; // << boleh override AccessionNumber
}

interface CreateDicomResult {
    instanceId: string;
    studyId?: string; // bisa undefined kalau Orthanc nggak punya
    seriesId: string;
    accessionNumber: string;
}

// =========================
// Konfigurasi dari ENV
// =========================

const ORTHANC_URL = process.env.ORTHANC_URL ?? "http://localhost";
const ORTHANC_HTTP_PORT = process.env.ORTHANC_HTTP_PORT ?? "8042";
const ORTHANC_USERNAME = process.env.ORTHANC_USERNAME ?? "orthanc";
const ORTHANC_PASSWORD = process.env.ORTHANC_PASSWORD ?? "orthanc";

// Ini nama modality yang kamu set di ORTHANC__DICOM_MODALITIES
// Di docker-compose kamu: "SATUSEHAT_ROUTER"
const DICOM_MODALITY_ID = process.env.ORTHANC_DICOM_MODALITY ?? "SATUSEHAT_ROUTER";

const ORTHANC_BASE_URL = `${ORTHANC_URL}:${ORTHANC_HTTP_PORT}`;
const ORTHANC_AUTH_HEADER = "Basic " + btoa(`${ORTHANC_USERNAME}:${ORTHANC_PASSWORD}`);

// Lokasi file DICOM sample yang mau di-upload
const SAMPLE_DICOM_PATH = process.env.DICOM_SAMPLE_PATH ?? "public/sample-dicom/series-000001/image-000001.dcm";

// =========================
// DATA SATUSEHAT (untuk test ini)
// =========================

// AccessionNumber / ACSN (HARUS sama dengan di ServiceRequest SATUSEHAT)
const SATUSEHAT_ACSN = "ACC1764061751897";

// ID resource ServiceRequest di SATUSEHAT (buat info/log aja di sini)
const SATUSEHAT_SERVICE_REQUEST_ID = "ff6ebbe3-9965-4113-9fc8-2b3e41a27db3";

// IHS Patient (MPI SATUSEHAT) – kita taruh di PatientID DICOM
const SATUSEHAT_PATIENT_IHS = "P00805884304";

// IHS Practitioner – dipakai di FHIR, nggak krusial di DICOM dummy ini,
// tapi kita log biar jelas
const SATUSEHAT_PRACTITIONER_IHS = "10006926841";

// (belum kepakai, tapi disimpan kalau nanti perlu generate UID sendiri)
const UID_ROOT = "1.2.826.0.1.3680043.8.498";

function generateUid(root: string = UID_ROOT): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1_000_000);
    return `${root}.${timestamp}.${random}`;
}

// =========================
// Helper DICOM: Date & Time
// =========================

export function toDicomDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}${month}${day}`;
}

export function toDicomTime(date: Date): string {
    const hours = `${date.getHours()}`.padStart(2, "0");
    const minutes = `${date.getMinutes()}`.padStart(2, "0");
    const seconds = `${date.getSeconds()}`.padStart(2, "0");
    return `${hours}${minutes}${seconds}`;
}

// =========================
// Core: create DICOM dummy
// =========================

export async function createDummyDicomInOrthanc(input: DummyDicomInput): Promise<CreateDicomResult> {
    // AccessionNumber:
    // - Kalau caller kasih `input.accessionNumber`, pakai itu
    // - Kalau tidak, fallback ke dummy ACC{timestamp}
    const accessionNumber = input.accessionNumber ?? `ACC${Date.now()}`;

    const dicomDate = toDicomDate(input.scheduledStart);
    const dicomTime = toDicomTime(input.scheduledStart);

    // PENTING:
    // - JANGAN isi StudyInstanceUID / SeriesInstanceUID / SOPInstanceUID
    //   -> Orthanc akan generate sendiri
    // - TAPI WAJIB isi SOPClassUID supaya bisa di-C-STORE ke remote (DICOM Router)
    //   contoh: CT Image Storage / CR Image Storage, dll
    //
    // Untuk X-Ray (XR...), kita pakai CR (Computed Radiography) sebagai contoh:
    //   SOPClassUID CR Image Storage = 1.2.840.10008.5.1.4.1.1.1
    const body = {
        Tags: {
            // Patient
            // di sini kita isi dengan IHS patient dari SATUSEHAT
            PatientID: input.patientId,
            PatientName: input.patientName,
            PatientBirthDate: input.patientBirthDate,
            PatientSex: input.patientSex,

            // Study
            AccessionNumber: accessionNumber,
            StudyDescription: input.description,
            StudyDate: dicomDate,
            StudyTime: dicomTime,

            // HANYA SOPClassUID yang kita tentukan
            // CR Image Storage (X-Ray)
            SOPClassUID: "1.2.840.10008.5.1.4.1.1.1",

            Modality: input.modality, // misal "CR"

            // Scheduled Procedure Step Sequence (0040,0100) - hanya untuk demo
            ScheduledProcedureStepSequence: [
                {
                    ScheduledStationAETitle: input.stationAeTitle,
                    ScheduledProcedureStepStartDate: dicomDate,
                    ScheduledProcedureStepStartTime: dicomTime,
                    Modality: input.modality,
                    ScheduledPerformingPhysicianName: "DR^DUMMY",
                    ScheduledProcedureStepDescription: input.description,
                    ScheduledProcedureStepID: `SPS${Date.now()}`,
                },
            ],
        },
    };

    console.log("[1] Mengirim /tools/create-dicom ke Orthanc...");
    console.log("[1] AccessionNumber yang akan dipakai:", accessionNumber);

    const res = await fetch(`${ORTHANC_BASE_URL}/tools/create-dicom`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: ORTHANC_AUTH_HEADER,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Orthanc /tools/create-dicom error: ${res.status} ${res.statusText} - ${text}`);
    }

    const json = (await res.json()) as any;
    const instanceId: string = json["ID"] ?? json["InstanceId"];

    if (!instanceId) {
        console.error("Respon Orthanc:", json);
        throw new Error("Tidak bisa menemukan ID instance dari response Orthanc");
    }

    console.log("[1] DICOM dummy berhasil dibuat di Orthanc. Instance ID:", instanceId);

    // Ambil info instance untuk tahu series/study
    console.log("[1] Mengambil detail instance untuk mendapatkan Series/Study ID...");
    const instRes = await fetch(`${ORTHANC_BASE_URL}/instances/${instanceId}`, {
        headers: {
            Authorization: ORTHANC_AUTH_HEADER,
        },
    });

    if (!instRes.ok) {
        const text = await instRes.text();
        throw new Error(`Orthanc /instances/${instanceId} error: ${instRes.status} ${instRes.statusText} - ${text}`);
    }

    const instJson = (await instRes.json()) as any;
    console.log("Instance JSON:", instJson);

    const seriesId: string | undefined = instJson["ParentSeries"];
    let studyId: string | undefined = instJson["ParentStudy"];

    if (!seriesId) {
        throw new Error("Tidak ada ParentSeries di instance (aneh, tapi ya sudah 🤔)");
    }

    // Kalau Orthanc belum isi ParentStudy, coba ambil dari /series/{seriesId}
    if (!studyId) {
        try {
            const seriesRes = await fetch(`${ORTHANC_BASE_URL}/series/${seriesId}`, {
                headers: {
                    Authorization: ORTHANC_AUTH_HEADER,
                },
            });

            if (seriesRes.ok) {
                const seriesJson = (await seriesRes.json()) as any;
                studyId = seriesJson["ParentStudy"];
                console.log("[1] Series JSON:", seriesJson);
            } else {
                const t = await seriesRes.text();
                console.warn(`[1] Gagal GET /series/${seriesId}: ${seriesRes.status} ${seriesRes.statusText} - ${t}`);
            }
        } catch (e) {
            console.warn("[1] Error saat GET /series untuk cari ParentStudy:", e);
        }
    }

    if (!studyId) {
        console.warn(
            "[1] WARNING: ParentStudy tidak ditemukan. Untuk test, kita akan pakai SERIES sebagai resource yang dikirim ke DICOM Router."
        );
    }

    console.log("[1] Study ID:", studyId ?? "(tidak tersedia)");
    console.log("[1] Series ID:", seriesId);
    console.log("[1] AccessionNumber:", accessionNumber);

    return {
        instanceId,
        studyId,
        seriesId,
        accessionNumber,
    };
}

// =========================
// Core: kirim ke DICOM Router
// =========================

export async function sendStudyToDicomRouter(resourceId: string, level: "study" | "series" | "instance" = "series") {
    console.log(`[2] Mengirim ${level} ${resourceId} ke modality ${DICOM_MODALITY_ID} (dicom-router)...`);

    const body = {
        Resources: [resourceId],
        Synchronous: false, // biar jadi job di Orthanc
    };

    const res = await fetch(`${ORTHANC_BASE_URL}/modalities/${DICOM_MODALITY_ID}/store`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: ORTHANC_AUTH_HEADER,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(
            `Orthanc /modalities/${DICOM_MODALITY_ID}/store error: ${res.status} ${res.statusText} - ${text}`
        );
    }

    const json = await res.json();
    console.log("[2] Job store ke DICOM Router berhasil dibuat.");
    console.dir(json, { depth: null });

    return json;
}

// =========================
// (Opsional) C-ECHO test
// =========================

export async function echoDicomRouter() {
    console.log(`[0] Coba C-ECHO ke modality ${DICOM_MODALITY_ID} (testing koneksi DICOM)...`);

    const res = await fetch(`${ORTHANC_BASE_URL}/modalities/${DICOM_MODALITY_ID}/echo`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: ORTHANC_AUTH_HEADER,
        },
        body: "{}",
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(
            `Orthanc /modalities/${DICOM_MODALITY_ID}/echo error: ${res.status} ${res.statusText} - ${text}`
        );
    }

    const json = await res.json();
    console.log("[0] C-ECHO OK:");
    console.dir(json, { depth: null });
    return json;
}

// =========================
// Main test flow
// =========================

export async function testOrthancDicomFlow() {
    try {
        console.log("=== TEST ORTHANC → DICOM ROUTER SATUSEHAT ===");
        console.log("Orthanc base URL:", ORTHANC_BASE_URL);
        console.log("DICOM modality ID (dicom-router):", DICOM_MODALITY_ID);
        console.log("SATUSEHAT:");
        console.log("  ServiceRequest ID:", SATUSEHAT_SERVICE_REQUEST_ID);
        console.log("  AccessionNumber  :", SATUSEHAT_ACSN);
        console.log("  Patient IHS      :", SATUSEHAT_PATIENT_IHS);
        console.log("  Practitioner IHS :", SATUSEHAT_PRACTITIONER_IHS);

        // 0. (opsional) C-ECHO dulu
        await echoDicomRouter();

        // 1. Buat tanggal jadwal dummy: besok jam 10:00
        const scheduled = new Date();
        scheduled.setDate(scheduled.getDate() + 1);
        scheduled.setHours(10, 0, 0, 0);

        // 2. Buat DICOM dummy di Orthanc
        const dicom = await createDummyDicomInOrthanc({
            // pakai IHS patient sebagai PatientID di DICOM
            patientId: SATUSEHAT_PATIENT_IHS,
            patientName: "DOE^JOHN", // dummy aja, sesuaikan kalau mau realistis
            patientBirthDate: "19900101",
            patientSex: "M",
            modality: "CR", // X-Ray (sesuai XR... di Accession)
            description: "Dummy X-Ray (XR) untuk test SATUSEHAT",
            stationAeTitle: "XRAY_DEVICE_01",
            scheduledStart: scheduled,
            // PENTING: pakai ACSN dari SATUSEHAT
            accessionNumber: SATUSEHAT_ACSN,
        });

        // 3. Kirim SERIES ke dicom-router
        const resourceIdToSend = dicom.seriesId; // atau dicom.instanceId kalau mau instance
        const job = await sendStudyToDicomRouter(resourceIdToSend, "series");

        console.log("=== TEST SELESAI ===");
        console.log("Instance ID     :", dicom.instanceId);
        console.log("Study ID        :", dicom.studyId ?? "(tidak tersedia)");
        console.log("Series ID       :", dicom.seriesId);
        console.log("AccessionNumber :", dicom.accessionNumber);
        console.log("Orthanc job     :", job);
    } catch (err) {
        console.error("TEST GAGAL:");
        console.error(err);
        process.exit(1);
    }
}

/**
 * Upload 1 file DICOM yang sudah ada di disk ke Orthanc
 * Path default: public/sample-dicom/series-000001/image-000001.dcm
 */
export async function uploadSampleDicomToOrthanc() {
    console.log("=== UPLOAD SAMPLE DICOM KE ORTHANC ===");
    console.log("File:", SAMPLE_DICOM_PATH);
    console.log("Orthanc base URL:", ORTHANC_BASE_URL);

    // Ambil file dari disk (pakai Bun)
    const file = Bun.file(SAMPLE_DICOM_PATH);

    if (!(await file.exists())) {
        throw new Error(`File DICOM tidak ditemukan: ${SAMPLE_DICOM_PATH}`);
    }

    const buffer = await file.arrayBuffer();

    // Kirim ke Orthanc sebagai /instances (standard DICOM upload)
    const res = await fetch(`${ORTHANC_BASE_URL}/instances`, {
        method: "POST",
        headers: {
            "Content-Type": "application/dicom",
            Authorization: ORTHANC_AUTH_HEADER,
        },
        body: buffer,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload DICOM gagal: ${res.status} ${res.statusText} - ${text}`);
    }

    const json = (await res.json()) as any;
    const instanceId: string = json["ID"];

    console.log("[UPLOAD] Instance ID baru:", instanceId);
    console.log("[UPLOAD] Path Orthanc   :", json["Path"]);

    // Ambil info instance buat tahu ParentSeries / ParentStudy
    const instRes = await fetch(`${ORTHANC_BASE_URL}/instances/${instanceId}`, {
        headers: {
            Authorization: ORTHANC_AUTH_HEADER,
        },
    });

    if (!instRes.ok) {
        const text = await instRes.text();
        throw new Error(`Gagal GET /instances/${instanceId}: ${instRes.status} ${instRes.statusText} - ${text}`);
    }

    const instJson = (await instRes.json()) as any;
    console.log("[UPLOAD] Instance JSON:", instJson);

    const seriesId: string | undefined = instJson["ParentSeries"];
    const studyId: string | undefined = instJson["ParentStudy"];

    console.log("[UPLOAD] Series ID:", seriesId ?? "(tidak ada)");
    console.log("[UPLOAD] Study ID :", studyId ?? "(tidak ada)");

    return { instanceId, seriesId, studyId };
}

/**
 * Modifikasi series di Orthanc supaya:
 * - PatientID = IHS patient SATUSEHAT
 * - AccessionNumber = ACSN SATUSEHAT
 */
export async function updateSeriesTagsForSatusehat(seriesId: string) {
    console.log(`[M] Modifikasi series ${seriesId} untuk set PatientID + AccessionNumber + Tanggal`);
    console.log("[M] Patient IHS      :", SATUSEHAT_PATIENT_IHS);
    console.log("[M] AccessionNumber  :", SATUSEHAT_ACSN);

    // Pakai tanggal & waktu sekarang (atau bisa kamu ganti pakai tanggal encounter)
    const now = new Date();
    const dicomDate = toDicomDate(now); // YYYYMMDD
    const dicomTime = toDicomTime(now); // HHMMSS

    const body = {
        Replace: {
            PatientID: SATUSEHAT_PATIENT_IHS,
            AccessionNumber: SATUSEHAT_ACSN,
            PatientName: "DOE^JOHN",
            StudyDescription: "X-Ray Test SATUSEHAT",

            // Perbaiki tanggal/waktu supaya nggak 2007 lagi
            // Minimal set ini:
            StudyDate: dicomDate,
            StudyTime: dicomTime,

            // Optional tapi bagus: sinkron sama Series
            SeriesDate: dicomDate,
            SeriesTime: dicomTime,
        },
        Force: true,
    };

    const res = await fetch(`${ORTHANC_BASE_URL}/series/${seriesId}/modify`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: ORTHANC_AUTH_HEADER,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Gagal modify series: ${res.status} ${res.statusText} - ${text}`);
    }

    const json = (await res.json()) as any;
    const newSeriesId: string = json["ID"];
    console.log("[M] Series baru ID:", newSeriesId);
    console.log("[M] Path:", json["Path"]);

    return newSeriesId;
}

/**
 * Flow lengkap:
 * 1. C-ECHO ke DICOM Router (cek koneksi)
 * 2. Upload file DICOM sample ke Orthanc
 * 3. Update tag PatientID + AccessionNumber supaya match SATUSEHAT
 * 4. Kirim SERIES hasil update ke DICOM Router
 */
export async function uploadSampleDicomAndSendToRouter() {
    console.log("=== FLOW: UPLOAD SAMPLE DICOM + PASIEN + KIRIM KE ROUTER ===");
    console.log("Orthanc base URL:", ORTHANC_BASE_URL);
    console.log("File DICOM       :", SAMPLE_DICOM_PATH);
    console.log("SATUSEHAT:");
    console.log("  ServiceRequest ID:", SATUSEHAT_SERVICE_REQUEST_ID);
    console.log("  AccessionNumber  :", SATUSEHAT_ACSN);
    console.log("  Patient IHS      :", SATUSEHAT_PATIENT_IHS);

    // 0. C-ECHO dulu
    await echoDicomRouter();

    // 1. Upload file DICOM asli ke Orthanc
    const { instanceId, seriesId } = await uploadSampleDicomToOrthanc();

    if (!seriesId) {
        throw new Error("[FLOW] Series ID tidak ditemukan dari instance upload");
    }

    // 2. Update tag supaya Orthanc punya PatientID & AccNumber sesuai SATUSEHAT
    const newSeriesId = await updateSeriesTagsForSatusehat(seriesId);

    // 3. Kirim SERIES yang sudah dimodif ke DICOM Router
    const job = await sendStudyToDicomRouter(newSeriesId, "series");

    console.log("=== SELESAI FLOW SAMPLE DICOM ===");
    console.log("Instance awal :", instanceId);
    console.log("Series awal   :", seriesId);
    console.log("Series baru   :", newSeriesId);
    console.log("Orthanc job   :", job);
}

const mode = process.argv[2] ?? "dummy";

if (mode === "file") {
    // Mode: cuma upload file DICOM existing ke Orthanc
    uploadSampleDicomToOrthanc().then(() => {
        setTimeout(() => process.exit(0), 100);
    });
} else if (mode === "file-send") {
    // Mode: upload file DICOM + set pasien + kirim ke DICOM Router
    uploadSampleDicomAndSendToRouter().then(() => {
        setTimeout(() => process.exit(0), 100);
    });
} else {
    // Mode default: bikin DICOM dummy via /tools/create-dicom lalu kirim
    testOrthancDicomFlow().then(() => {
        setTimeout(() => process.exit(0), 100);
    });
}
