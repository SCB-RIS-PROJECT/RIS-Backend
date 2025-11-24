import { loggerPino } from "@/config/log";
import { syncAllPatientsToOrthanc } from "@/lib/orthanc";

async function main() {
    try {
        loggerPino.info("Memulai sync pasien ke Orthanc...");
        await syncAllPatientsToOrthanc();
        loggerPino.info("Sync selesai!");
        process.exit(0);
    } catch (error) {
        loggerPino.error({ error }, "Gagal sync pasien");
        process.exit(1);
    }
}

main();
