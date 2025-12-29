import { Client } from "pg";
import env from "@/config/env";

const splitDiagnosisData = async () => {
    const client = new Client({
        connectionString: env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log("Connected to database");

        // Check if columns exist
        const checkColumns = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tb_detail_order' 
            AND column_name IN ('diagnosis_code', 'diagnosis_display')
        `);
        
        console.log("Found columns:", checkColumns.rows.map(r => r.column_name));

        // Update existing data - split diagnosis field
        console.log("\nSplitting existing diagnosis data...");
        const updateResult = await client.query(`
            UPDATE tb_detail_order
            SET 
                diagnosis_code = CASE
                    WHEN diagnosis IS NOT NULL AND diagnosis != '' THEN
                        CASE
                            -- Pattern: "J18.9 - Pneumonia" or "J18.9: Pneumonia"
                            WHEN diagnosis ~ '^[A-Z][0-9]+\.?[0-9]*\\s*[-:]\\s*' THEN
                                TRIM(REGEXP_REPLACE(diagnosis, '^([A-Z][0-9]+\\.?[0-9]*)\\s*[-:].*', '\\1'))
                            -- Pattern: just code "J18.9"
                            WHEN diagnosis ~ '^[A-Z][0-9]+\\.?[0-9]*$' THEN
                                TRIM(diagnosis)
                            -- No recognizable code pattern
                            ELSE NULL
                        END
                    ELSE NULL
                END,
                diagnosis_display = CASE
                    WHEN diagnosis IS NOT NULL AND diagnosis != '' THEN
                        CASE
                            -- Pattern: "J18.9 - Pneumonia"
                            WHEN diagnosis ~ '-' THEN
                                TRIM(SPLIT_PART(diagnosis, '-', 2))
                            -- Pattern: "J18.9: Pneumonia"
                            WHEN diagnosis ~ ':' THEN
                                TRIM(SPLIT_PART(diagnosis, ':', 2))
                            -- Pattern: just code, no display
                            WHEN diagnosis ~ '^[A-Z][0-9]+\\.?[0-9]*$' THEN
                                NULL
                            -- No code pattern, treat whole thing as display
                            ELSE TRIM(diagnosis)
                        END
                    ELSE NULL
                END
            WHERE diagnosis IS NOT NULL AND diagnosis != ''
            AND (diagnosis_code IS NULL OR diagnosis_display IS NULL)
        `);
        
        console.log(`Updated ${updateResult.rowCount} records`);

        // Create index if not exists
        console.log("\nCreating index...");
        await client.query(`
            CREATE INDEX IF NOT EXISTS detail_order_diagnosis_code_idx 
            ON tb_detail_order(diagnosis_code)
        `);
        console.log("Index created");

        // Check results
        const result = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(diagnosis) as with_diagnosis,
                COUNT(diagnosis_code) as with_code,
                COUNT(diagnosis_display) as with_display
            FROM tb_detail_order
        `);
        
        console.log("\n=== Migration Results ===");
        console.log(`Total records: ${result.rows[0].total}`);
        console.log(`Records with old diagnosis field: ${result.rows[0].with_diagnosis}`);
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
            LIMIT 10
        `);
        
        console.log("\n=== Sample Data ===");
        console.table(sample.rows);

        console.log("\n✅ Migration completed successfully!");

    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    } finally {
        await client.end();
    }
};

splitDiagnosisData();
