import { eq } from "drizzle-orm";
import env from "@/config/env";
import { loggerPino } from "@/config/log";
import db from "@/database/db";
import { patientTable } from "@/database/schemas/schema-patient";

const ORTHANC_URL = `${env.ORTHANC_URL}:${env.ORTHANC_HTTP_PORT}`;
const ORTHANC_AUTH = btoa("orthanc:orthanc");

export function toDicomDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}${month}${day}`;
}

export function toDicomPersonName(name: string): string {
    return name.trim().replace(/\s+/g, "^");
}

export function toDicomGender(gender: string): string {
    switch (gender.toLowerCase()) {
        case "male":
        case "m":
            return "M";
        case "female":
        case "f":
            return "F";
        default:
            return "O";
    }
}

export async function pushPatientToOrthanc(patientId: string) {
    // 1. ambil data pasien dari DB
    const [patient] = await db.select().from(patientTable).where(eq(patientTable.id, patientId)).limit(1);

    if (!patient) {
        throw new Error("Patient not found");
    }

    // 2. build body sesuai /tools/create-dicom
    const body = {
        Tags: {
            // ID di DICOM – biasanya pakai MRN
            PatientID: patient.mrn,

            // Nama pasien
            PatientName: toDicomPersonName(patient.name),

            // DOB
            PatientBirthDate: toDicomDate(patient.birth_date),

            // Gender
            PatientSex: toDicomGender(patient.gender as string),

            // Opsional tapi useful:
            PatientAddress: patient.address ?? undefined,
            PatientTelephoneNumbers: patient.phone ?? undefined,

            // Kalau mau simpan NIK juga:
            OtherPatientIDs: patient.nik,
            // Bisa tambahin StudyDescription/Modality supaya keliatan rapi
            StudyDescription: "HIS-ONLY PATIENT",
            Modality: "OT", // Other
        },
    };

    // 3. call REST Orthanc
    const res = await fetch(`${ORTHANC_URL}/tools/create-dicom`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${ORTHANC_AUTH}`,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        throw new Error(`Orthanc error: ${res.status} ${res.statusText}`);
    }

    return await res.json();
}

export async function syncAllPatientsToOrthanc() {
    const patients = await db.select().from(patientTable);

    for (const p of patients) {
        try {
            await pushPatientToOrthanc(p.id);
        } catch (err) {
            loggerPino.error({ patientId: p.id, error: err }, "Gagal push pasien");
        }
    }
}
