// biome-ignore-all lint/suspicious/noConsole: <because seeder>
// biome-ignore-all lint/suspicious/noExplicitAny: <because seeder>

import { sql } from "drizzle-orm";
import db from "@/database/db";
import { seedModality } from "@/database/seeders/seeder-modality";
import { SeedPatient } from "@/database/seeders/seeder-patient";
import { SeedPractitioner } from "@/database/seeders/seeder-practitioner";
import { seedRolePermission } from "@/database/seeders/seeder-role-permission";
import { SeedUser } from "@/database/seeders/seeder-user";

const resetDatabase = async () => {
    const result = await db.execute(sql`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '__drizzle_%'
  `);

    const tableNames = (result as any).rows?.map((r: any) => r.tablename) ?? [];

    if (tableNames.length === 0) {
        console.log("No tables found to truncate.");
        return;
    }

    const joined = tableNames.map((t: any) => `"public"."${t}"`).join(", ");

    console.log("Reset (TRUNCATE) table:", tableNames.join(", "));

    await db.execute(sql.raw(`TRUNCATE TABLE ${joined} RESTART IDENTITY CASCADE;`));
};

const main = async () => {
    try {
        // reset database
        await resetDatabase();

        // seed
        await seedRolePermission();
        await SeedUser();
        await SeedPatient();
        await SeedPractitioner();
        await seedModality();

        console.log("✅ All seeding completed");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error while seeding:", error);
        process.exit(1);
    }
};

main();
