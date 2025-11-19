// biome-ignore-all lint/suspicious/noConsole: <because seeder>

import db from "@/database/db";
import { FactoryUser } from "@/database/factories/factory-user";
import { userTable } from "@/database/schemas/schema-user";

export const SeedUser = async () => {
    try {
        const users = await FactoryUser(10);

        await db.insert(userTable).values(users);

        console.log("✅ User seeding completed");
    } catch (error) {
        console.error("❌ Error seeding users:", error);
        throw error;
    }
};
