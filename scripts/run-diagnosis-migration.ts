import { readFileSync } from "fs";
import { Client } from "pg";
import env from "@/config/env";

const runMigration = async () => {
    const client = new Client({
        connectionString: env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log("Connected to database");

        // Read migration file
        const migrationSQL = readFileSync(
            "./src/database/migrations/0010_split_diagnosis_code_display.sql",
            "utf-8"
        );

        console.log("Running migration...");
        await client.query(migrationSQL);
        console.log("Migration completed successfully!");

        // Check results
        const result = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(diagnosis_code) as with_code,
                COUNT(diagnosis_display) as with_display
            FROM tb_detail_order
            WHERE diagnosis IS NOT NULL AND diagnosis != ''
        `);
        
        console.log("\nMigration results:");
        console.log(`Total records with diagnosis: ${result.rows[0].total}`);
        console.log(`Records with diagnosis_code: ${result.rows[0].with_code}`);
        console.log(`Records with diagnosis_display: ${result.rows[0].with_display}`);

        // Show sample
        const sample = await client.query(`
            SELECT 
                diagnosis,
                diagnosis_code,
                diagnosis_display
            FROM tb_detail_order
            WHERE diagnosis IS NOT NULL AND diagnosis != ''
            LIMIT 5
        `);
        
        console.log("\nSample data:");
        console.table(sample.rows);

    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    } finally {
        await client.end();
    }
};

runMigration();
