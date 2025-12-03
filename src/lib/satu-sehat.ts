import type { FHIREncounter, FHIREncounterParams } from "@/interface/satu-sehat.interface";

/**
 * Convert a Date object to a string in the format expected by Satu Sehat.
 * This is equivalent to calling `toISOString()` on the Date object, but then replacing the trailing ".XXXZ" with "+00:00".
 * @param {Date} date - The Date object to convert.
 * @returns {string} - The converted string.
 */
export function toSatusehatDateTime(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

/**
 * Convert encounter data to FHIR Encounter format for Satu Sehat
 * @param params - Encounter parameters
 * @returns FHIR Encounter object
 */
export function toFHIRPostEncounter(params: FHIREncounterParams): FHIREncounter {
    return {
        resourceType: "Encounter",
        status: params.status,
        class: {
            system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            code: params.classCode,
            display: params.classDisplay,
        },
        subject: {
            reference: `Patient/${params.patientID}`,
            display: params.patientName,
        },
        participant: [
            {
                type: [
                    {
                        coding: [
                            {
                                system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                                code: "ATND",
                                display: "attender",
                            },
                        ],
                    },
                ],
                individual: {
                    reference: `Practitioner/${params.practitionerID}`,
                    display: params.practitionerName,
                },
            },
        ],
        period: {
            start: toSatusehatDateTime(params.startTime),
        },
        location: [
            {
                location: {
                    reference: `Location/${params.locationID}`,
                    display: params.locationName,
                },
            },
        ],
        statusHistory: [
            {
                status: params.status,
                period: {
                    start: toSatusehatDateTime(params.startTime),
                },
            },
        ],
        serviceProvider: {
            reference: `Organization/${params.organizationID}`,
        },
        identifier: [
            {
                system: `http://sys-ids.kemkes.go.id/encounter/${params.organizationID}`,
                value: params.organizationIHSNumber,
            },
        ],
    };
}
