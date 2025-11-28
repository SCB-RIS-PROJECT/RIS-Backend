import env from "@/config/env";

const ORTHANC_URL = env.ORTHANC_URL ?? "http://localhost";
const ORTHANC_HTTP_PORT = env.ORTHANC_HTTP_PORT ?? "8042";
const ORTHANC_USERNAME = env.ORTHANC_USERNAME ?? "orthanc";
const ORTHANC_PASSWORD = env.ORTHANC_PASSWORD ?? "orthanc";
const DICOM_MODALITY_ID = env.ORTHANC_DICOM_MODALITY ?? "SATUSEHAT_ROUTER";
const ORTHANC_BASE_URL = `${ORTHANC_URL}:${ORTHANC_HTTP_PORT}`;
const ORTHANC_AUTH_HEADER = "Basic " + btoa(`${ORTHANC_USERNAME}:${ORTHANC_PASSWORD}`);

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
