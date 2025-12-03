// biome-ignore-all lint/suspicious/noConsole: <because seeder>

import { eq } from "drizzle-orm";
import db from "@/database/db";
import { createManyOrders } from "@/database/factories/factory-order";
import { loincTable } from "@/database/schemas/schema-loinc";
import { modalityTable } from "@/database/schemas/schema-modality";
import { orderTable } from "@/database/schemas/schema-order";
import { patientTable } from "@/database/schemas/schema-patient";
import { practitionerTable } from "@/database/schemas/schema-practitioner";
import { userTable } from "@/database/schemas/schema-user";

type OrderPriority = "ROUTINE" | "URGENT" | "STAT";
type OrderStatus = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export async function seedOrder() {
    console.log("🌱 Seeding orders...");

    // Get required IDs
    const [patient] = await db.select().from(patientTable).limit(1);
    const [practitioner] = await db.select().from(practitionerTable).limit(1);
    const [user] = await db.select().from(userTable).limit(1);

    if (!patient || !practitioner || !user) {
        console.log("⚠️  Missing required data (patient, practitioner, or user). Skipping order seeding.");
        return;
    }

    // Get LOINC codes with their modality codes
    const loincCodes = await db
        .select({
            id: loincTable.id,
            code: loincTable.code,
            name: loincTable.name,
            id_modality: loincTable.id_modality,
            require_fasting: loincTable.require_fasting,
            require_pregnancy_check: loincTable.require_pregnancy_check,
            require_use_contrast: loincTable.require_use_contrast,
        })
        .from(loincTable)
        .limit(10);

    if (loincCodes.length === 0) {
        console.log("⚠️  No LOINC codes found. Skipping order seeding.");
        return;
    }

    // Get modality codes
    const modalityIds = Array.from(new Set(loincCodes.map((l) => l.id_modality).filter(Boolean)));
    const modalities = await db
        .select()
        .from(modalityTable)
        .where(eq(modalityTable.id, modalityIds[0] as string));

    // Get all modalities if there are more
    for (let i = 1; i < modalityIds.length; i++) {
        const [modality] = await db
            .select()
            .from(modalityTable)
            .where(eq(modalityTable.id, modalityIds[i] as string));
        if (modality) {
            modalities.push(modality);
        }
    }

    const modalityMap = new Map(modalities.map((m) => [m.id, m.code]));

    // Prepare order data
    const ordersData = loincCodes.map((loinc, index) => {
        const modalityCode = modalityMap.get(loinc.id_modality as string) || "XR";
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + index); // Different dates for testing

        const priority: OrderPriority = index % 3 === 0 ? "STAT" : index % 2 === 0 ? "URGENT" : "ROUTINE";
        const status: OrderStatus = index % 4 === 0 ? "CONFIRMED" : "PENDING";

        return {
            idPatient: patient.id,
            idPractitioner: practitioner.id,
            idCreatedBy: user.id,
            idLoinc: loinc.id,
            idModality: loinc.id_modality as string,
            modalityCode,
            priority,
            status,
            diagnosis: `Clinical diagnosis for ${loinc.name}`,
            notes: `Test order for ${loinc.code} - ${loinc.name}`,
            scheduledDate: scheduledDate,
            requireFasting: loinc.require_fasting,
            requirePregnancyCheck: loinc.require_pregnancy_check,
            requireUseContrast: loinc.require_use_contrast,
        };
    });

    // Create orders
    await createManyOrders(ordersData);

    const count = await db.select().from(orderTable);
    console.log(`✅ Seeded ${count.length} orders`);
}
