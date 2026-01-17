/**
 * DCM4CHEE MWL (Modality Worklist) Library
 * 
 * Library untuk push/query MWL ke DCM4CHEE Arc Light via REST API
 */

import env from "@/config/env";

// ===========================
// TYPES
// ===========================

export interface DCM4CHEEMWLItem {
    // Patient Info
    patientId: string;
    patientName: string;
    patientBirthDate: string | Date;
    patientSex: "M" | "F" | "O";
    patientAddress?: string;
    patientPhone?: string;

    // Procedure Info
    accessionNumber: string;
    requestedProcedure: string;

    // Schedule Info
    modality: string;
    stationAETitle: string;
    scheduledDate: Date;
    scheduledTime?: string;
    scheduledStepId: string;
    scheduledStepDescription?: string;

    // Referring Physician
    referringPhysician?: string;
}

export interface DCM4CHEEConfig {
    host: string;
    port: number;
    aeTitle: string;
    restApiBase: string;
}

export interface DCM4CHEEMWLResult {
    success: boolean;
    patientCreated?: boolean;
    mwlCreated?: boolean;
    error?: string;
    mwlData?: {
        studyInstanceUID: string;
        accessionNumber: string;
        patientId: string;
        patientName: string;
        patientBirthDate: string;
        patientSex: string;
        modality: string;
        stationAETitle: string;
        scheduledDate: string;
        scheduledTime: string;
        scheduledStepId: string;
        requestedProcedure: string;
        referringPhysician?: string;
    };
}

// ===========================
// CONFIGURATION
// ===========================

const DCM4CHEE_CONFIG: DCM4CHEEConfig = {
    host: env.DCM4CHEE_HOST || "192.168.101.103",
    port: Number(env.DCM4CHEE_PORT) || 8080,
    aeTitle: env.DCM4CHEE_AE_TITLE || "DCM4CHEE",
    restApiBase: env.DCM4CHEE_REST_API || `http://${env.DCM4CHEE_HOST || "192.168.250.205"}:${env.DCM4CHEE_PORT || 8080}/dcm4chee-arc`,
};

// ===========================
// HELPERS
// ===========================

/**
 * Convert date to DICOM DA format (YYYYMMDD)
 */
function toDicomDate(date: Date | string): string {
    if (typeof date === "string") {
        // If already in YYYYMMDD format
        if (/^\d{8}$/.test(date)) return date;
        date = new Date(date);
    }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}${month}${day}`;
}

/**
 * Convert date to DICOM TM format (HHMMSS)
 */
function toDicomTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}${minutes}${seconds}`;
}

/**
 * Convert name to DICOM PN format (LastName^FirstName)
 */
function toDicomPersonName(name: string): string {
    // If already has ^, return as-is
    if (name.includes("^")) return name;

    // Split by space and format
    const parts = name.split(" ");
    if (parts.length >= 2) {
        return `${parts[0]}^${parts.slice(1).join(" ")}`;
    }
    return name;
}

// ===========================
// REST API FUNCTIONS
// ===========================

/**
 * Create patient in DCM4CHEE
 * DCM4CHEE requires patient to exist before creating MWL item
 */
export async function createPatientInDcm4chee(item: DCM4CHEEMWLItem): Promise<{ success: boolean; error?: string }> {
    const patientPayload: Record<string, any> = {
        "00100010": { "vr": "PN", "Value": [{ "Alphabetic": toDicomPersonName(item.patientName) }] },
        "00100020": { "vr": "LO", "Value": [item.patientId] },
        "00100030": { "vr": "DA", "Value": [toDicomDate(item.patientBirthDate)] },
        "00100040": { "vr": "CS", "Value": [item.patientSex] },
    };

    // Optional fields
    if (item.patientAddress) {
        patientPayload["00101040"] = { "vr": "LO", "Value": [item.patientAddress] };
    }
    if (item.patientPhone) {
        patientPayload["00102154"] = { "vr": "SH", "Value": [item.patientPhone] };
    }

    const url = `${DCM4CHEE_CONFIG.restApiBase}/aets/${DCM4CHEE_CONFIG.aeTitle}/rs/patients`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/dicom+json",
                "Accept": "application/json",
            },
            body: JSON.stringify(patientPayload),
        });

        if (response.ok || response.status === 409) {
            // 409 = Conflict (patient already exists) - this is OK
            return { success: true };
        }

        const error = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${error}` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Create MWL item in DCM4CHEE
 */
export async function createMWLInDcm4chee(item: DCM4CHEEMWLItem): Promise<{ success: boolean; error?: string; studyInstanceUID?: string; scheduledTime?: string }> {
    const scheduledDate = item.scheduledDate instanceof Date ? item.scheduledDate : new Date(item.scheduledDate);
    const scheduledTime = item.scheduledTime || toDicomTime(scheduledDate);

    // Generate Study Instance UID (required by DCM4CHEE)
    // Format: {org-root}.{timestamp}.{random}
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100000);
    const studyInstanceUID = `1.2.826.0.1.3680043.8.498.${timestamp}.${random}`;

    const mwlPayload = {
        "0020000D": { "vr": "UI", "Value": [studyInstanceUID] },
        "00080050": { "vr": "SH", "Value": [item.accessionNumber] },
        "00100020": { "vr": "LO", "Value": [item.patientId] },
        "00080090": { "vr": "PN", "Value": [{ "Alphabetic": item.referringPhysician ? toDicomPersonName(item.referringPhysician) : "Unknown" }] },
        "00321060": { "vr": "LO", "Value": [item.requestedProcedure] },
        "00400100": {
            "vr": "SQ",
            "Value": [{
                "00080060": { "vr": "CS", "Value": [item.modality] },
                "00400001": { "vr": "AE", "Value": [item.stationAETitle] },
                "00400002": { "vr": "DA", "Value": [toDicomDate(scheduledDate)] },
                "00400003": { "vr": "TM", "Value": [scheduledTime] },
                "00400009": { "vr": "SH", "Value": [item.scheduledStepId] },
                "00400007": { "vr": "LO", "Value": [item.scheduledStepDescription || item.requestedProcedure] },
            }]
        }
    };

    const url = `${DCM4CHEE_CONFIG.restApiBase}/aets/${DCM4CHEE_CONFIG.aeTitle}/rs/mwlitems`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/dicom+json",
                "Accept": "application/json",
            },
            body: JSON.stringify(mwlPayload),
        });

        if (response.ok) {
            return { success: true, studyInstanceUID, scheduledTime };
        }

        const error = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${error}` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Push worklist to DCM4CHEE (create patient + MWL item)
 */
export async function pushWorklistToDcm4chee(item: DCM4CHEEMWLItem): Promise<DCM4CHEEMWLResult> {
    // Step 1: Create patient first
    const patientResult = await createPatientInDcm4chee(item);
    if (!patientResult.success) {
        return {
            success: false,
            patientCreated: false,
            mwlCreated: false,
            error: `Patient creation failed: ${patientResult.error}`,
        };
    }

    // Step 2: Create MWL item
    const mwlResult = await createMWLInDcm4chee(item);
    if (!mwlResult.success) {
        return {
            success: false,
            patientCreated: true,
            mwlCreated: false,
            error: `MWL creation failed: ${mwlResult.error}`,
        };
    }

    // Prepare complete MWL data for response
    const scheduledDate = item.scheduledDate instanceof Date ? item.scheduledDate : new Date(item.scheduledDate);

    return {
        success: true,
        patientCreated: true,
        mwlCreated: true,
        mwlData: {
            studyInstanceUID: mwlResult.studyInstanceUID!,
            accessionNumber: item.accessionNumber,
            patientId: item.patientId,
            patientName: item.patientName,
            patientBirthDate: typeof item.patientBirthDate === 'string' ? item.patientBirthDate : toDicomDate(item.patientBirthDate),
            patientSex: item.patientSex,
            modality: item.modality,
            stationAETitle: item.stationAETitle,
            scheduledDate: toDicomDate(scheduledDate),
            scheduledTime: mwlResult.scheduledTime!,
            scheduledStepId: item.scheduledStepId,
            requestedProcedure: item.requestedProcedure,
            referringPhysician: item.referringPhysician,
        },
    };
}

/**
 * Query MWL items from DCM4CHEE
 */
export async function queryMWLFromDcm4chee(params?: {
    accessionNumber?: string;
    patientId?: string;
    modality?: string;
    scheduledDate?: string;
}): Promise<{ success: boolean; data?: any[]; error?: string }> {
    let url = `${DCM4CHEE_CONFIG.restApiBase}/aets/${DCM4CHEE_CONFIG.aeTitle}/rs/mwlitems`;

    const queryParams: string[] = [];
    if (params?.accessionNumber) queryParams.push(`AccessionNumber=${params.accessionNumber}`);
    if (params?.patientId) queryParams.push(`PatientID=${params.patientId}`);
    if (params?.modality) queryParams.push(`Modality=${params.modality}`);
    if (params?.scheduledDate) queryParams.push(`ScheduledProcedureStepStartDate=${params.scheduledDate}`);

    if (queryParams.length > 0) {
        url += `?${queryParams.join("&")}`;
    }

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/dicom+json",
            },
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        const error = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${error}` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Delete MWL item from DCM4CHEE
 */
export async function deleteMWLFromDcm4chee(
    studyInstanceUID: string,
    spsID: string
): Promise<{ success: boolean; error?: string }> {
    const url = `${DCM4CHEE_CONFIG.restApiBase}/aets/${DCM4CHEE_CONFIG.aeTitle}/rs/mwlitems/${studyInstanceUID}/${spsID}`;

    try {
        const response = await fetch(url, {
            method: "DELETE",
        });

        if (response.ok || response.status === 204) {
            return { success: true };
        }

        const error = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${error}` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Query patients from DCM4CHEE
 */
export async function queryPatientsFromDcm4chee(params?: {
    patientId?: string;
    patientName?: string;
    limit?: number;
}): Promise<{ success: boolean; data?: any[]; error?: string }> {
    let url = `${DCM4CHEE_CONFIG.restApiBase}/aets/${DCM4CHEE_CONFIG.aeTitle}/rs/patients`;

    const queryParams: string[] = [];
    if (params?.patientId) queryParams.push(`PatientID=${params.patientId}`);
    if (params?.patientName) queryParams.push(`PatientName=${params.patientName}*`);
    if (params?.limit) queryParams.push(`limit=${params.limit}`);

    if (queryParams.length > 0) {
        url += `?${queryParams.join("&")}`;
    }

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/dicom+json",
            },
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        const error = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${error}` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// Export config for external use
export { DCM4CHEE_CONFIG };
