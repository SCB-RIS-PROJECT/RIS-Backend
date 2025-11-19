// biome-ignore-all lint/suspicious/noConsole: <because seeder>

import db from "@/database/db";
import { FactoryPatient, resetMRNCounter } from "@/database/factories/factory-patient";
import { ss_patients } from "@/database/schemas/constants";
import { patientTable } from "@/database/schemas/schema-patient";

export const SeedPatient = async () => {
    try {
        // Reset MRN counter untuk memastikan mulai dari L00001 dan P00001
        resetMRNCounter();

        // Generate satu sehat patients dengan data yang sudah ada
        const ssPatients = await FactoryPatient(
            ss_patients.map((patient) => ({
                gender: patient.gender as "MALE" | "FEMALE",
                nik: patient.nik,
                name: patient.name,
                birth_date: patient.birth_date,
                ihs_number: patient.ihs_number,
                ihs_last_sync: patient.ihs_last_sync,
                ihs_response_status: patient.ihs_response_status,
            }))
        );

        // Generate 50 pasien (random gender)
        const randomPatients = await FactoryPatient(50);

        // Gabungkan semua pasien
        const allPatients = [...ssPatients, ...randomPatients];

        await db.insert(patientTable).values(allPatients);

        console.log("✅ Pasien seeding completed");
        console.log(`   - Total: ${allPatients.length} pasien`);
        console.log(`   - Satu Sehat: ${ssPatients.length} pasien`);
        console.log(`   - Random: ${randomPatients.length} pasien`);
        console.log(`   - Laki-laki: ${allPatients.filter((p) => p.gender === "MALE").length} pasien`);
        console.log(`   - Perempuan: ${allPatients.filter((p) => p.gender === "FEMALE").length} pasien`);
    } catch (error) {
        console.error("❌ Error seeding pasien:", error);
        throw error;
    }
};
