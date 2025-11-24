import { loggerPino } from "@/config/log";
import { createWorklistItem, toDicomDate, toDicomTime } from "@/lib/worklist";

async function main() {
    try {
        loggerPino.info("Membuat contoh worklist item...");

        // Contoh: Buat worklist untuk pemeriksaan CT Scan besok jam 10 pagi
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);

        const worklistItem = {
            // Data Pasien
            patientId: "P001",
            patientName: "DOE^JOHN", // Format DICOM: FAMILY^GIVEN
            patientBirthDate: "19900101",
            patientSex: "M" as const,

            // Data Study/Pemeriksaan
            accessionNumber: `ACC${Date.now()}`, // Nomor unik pemeriksaan
            requestedProcedureDescription: "CT Scan Abdomen dengan kontras",

            // Jadwal Pemeriksaan
            scheduledProcedureStepDescription: "CT Abdomen",
            scheduledStationAETitle: "CT_SCANNER_01", // AE Title dari modality
            scheduledProcedureStepStartDate: toDicomDate(tomorrow),
            scheduledProcedureStepStartTime: toDicomTime(tomorrow),
            modality: "CT",

            // Opsional
            scheduledPerformingPhysicianName: "DR^RADIOLOGIST",
        };

        const result = await createWorklistItem(worklistItem);
        loggerPino.info({ result }, "Worklist item berhasil dibuat!");

        // Worklist sekarang bisa diquery oleh modality menggunakan DICOM C-FIND
        loggerPino.info("Modality sekarang bisa query worklist ini menggunakan AE Title: CT_SCANNER_01");

        process.exit(0);
    } catch (error) {
        const err = error as Error;
        loggerPino.error({ error: err.message, stack: err.stack }, "Gagal membuat worklist item");
        process.exit(1);
    }
}

main();
