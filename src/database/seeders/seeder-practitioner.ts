// biome-ignore-all lint/suspicious/noConsole: <because seeder>

import db from "@/database/db";
import { FactoryPractitioner } from "@/database/factories/factory-practitioner";
import { ss_practitioners } from "@/database/schemas/constants";
import { practitionerTable } from "@/database/schemas/schema-practitioner";

export const SeedPractitioner = async () => {
    try {
        // Generate satu sehat practitioners dengan data yang sudah ada
        const ssPractitioners = await FactoryPractitioner(
            ss_practitioners.map((practitioner) => ({
                gender: practitioner.gender as "MALE" | "FEMALE",
                role: practitioner.role as "DOCTOR" | "NURSE" | "PHARMACIST",
                nik: practitioner.nik,
                name: practitioner.name,
                birth_date: practitioner.birth_date,
                ihs_number: practitioner.ihs_number,
                ihs_last_sync: practitioner.ihs_last_sync,
                ihs_response_status: practitioner.ihs_response_status,
            }))
        );

        // Generate 30 practitioner dengan berbagai role
        const randomPractitioners = await FactoryPractitioner(30);

        // Gabungkan semua practitioners
        const allPractitioners = [...ssPractitioners, ...randomPractitioners];

        await db.insert(practitionerTable).values(allPractitioners);

        // Count by role
        const roleCount = allPractitioners.reduce((acc, p) => {
            const role = p.role as string;
            acc[role] = (acc[role] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        console.log("✅ Practitioner seeding completed");
        console.log(`   - Total: ${allPractitioners.length} practitioners`);
        console.log(`   - Satu Sehat: ${ssPractitioners.length} practitioners`);
        console.log(`   - Random: ${randomPractitioners.length} practitioners`);
        console.log(`   - Laki-laki: ${allPractitioners.filter((p) => p.gender === "MALE").length} practitioners`);
        console.log(`   - Perempuan: ${allPractitioners.filter((p) => p.gender === "FEMALE").length} practitioners`);
        console.log("   - By Role:");
        Object.entries(roleCount).forEach(([role, count]) => {
            console.log(`     • ${role}: ${count}`);
        });
    } catch (error) {
        console.error("❌ Error seeding practitioner:", error);
        throw error;
    }
};
