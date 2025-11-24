import env from "@/config/env";
import { loggerPino } from "@/config/log";

const ORTHANC_URL = `${env.ORTHANC_URL}:${env.ORTHANC_HTTP_PORT}`;
const ORTHANC_AUTH = btoa("orthanc:orthanc");

interface WorklistItem {
    patientId: string;
    patientName: string;
    patientBirthDate: string; // YYYYMMDD
    patientSex: "M" | "F" | "O";
    accessionNumber: string;
    scheduledProcedureStepDescription: string;
    scheduledStationAETitle: string;
    scheduledProcedureStepStartDate: string; // YYYYMMDD
    scheduledProcedureStepStartTime: string; // HHMMSS
    modality: string;
    scheduledPerformingPhysicianName?: string;
    requestedProcedureDescription?: string;
}

/**
 * Membuat worklist item di Orthanc
 * Worklist digunakan untuk jadwal pemeriksaan yang akan diambil oleh modality (CT/MR/X-Ray)
 */
export async function createWorklistItem(item: WorklistItem) {
    const body = {
        Tags: {
            // Patient Information
            PatientID: item.patientId,
            PatientName: item.patientName,
            PatientBirthDate: item.patientBirthDate,
            PatientSex: item.patientSex,

            // Study Information
            AccessionNumber: item.accessionNumber,
            RequestedProcedureDescription: item.requestedProcedureDescription || "",
            RequestedProcedureID: item.accessionNumber,

            // Scheduled Procedure Step Sequence (0040,0100)
            ScheduledProcedureStepSequence: [
                {
                    ScheduledStationAETitle: item.scheduledStationAETitle,
                    ScheduledProcedureStepStartDate: item.scheduledProcedureStepStartDate,
                    ScheduledProcedureStepStartTime: item.scheduledProcedureStepStartTime,
                    Modality: item.modality,
                    ScheduledPerformingPhysicianName: item.scheduledPerformingPhysicianName || "",
                    ScheduledProcedureStepDescription: item.scheduledProcedureStepDescription,
                    ScheduledProcedureStepID: `SPS${Date.now()}`,
                },
            ],
        },
    };

    const res = await fetch(`${ORTHANC_URL}/tools/create-dicom`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${ORTHANC_AUTH}`,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Orthanc error: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const result = await res.json();
    loggerPino.info({ accessionNumber: item.accessionNumber }, "Worklist item created");
    return result;
}

/**
 * Generate Study Instance UID sederhana
 * Format: 1.2.826.0.1.3680043.8.498.{timestamp}.{random}
 */
export function generateStudyInstanceUID(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `1.2.826.0.1.3680043.8.498.${timestamp}.${random}`;
}

/**
 * Format date ke DICOM date format (YYYYMMDD)
 */
export function toDicomDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}${month}${day}`;
}

/**
 * Format time ke DICOM time format (HHMMSS)
 */
export function toDicomTime(date: Date): string {
    const hours = `${date.getHours()}`.padStart(2, "0");
    const minutes = `${date.getMinutes()}`.padStart(2, "0");
    const seconds = `${date.getSeconds()}`.padStart(2, "0");
    return `${hours}${minutes}${seconds}`;
}
