import { Pool } from "pg";
import env from "../src/config/env";

const pool = new Pool({
    connectionString: env.DATABASE_URL,
});

async function cleanup() {
    const client = await pool.connect();
    
    try {
        console.log("Starting cleanup migration...");
        
        // Drop tb_profile if exists
        try {
            await client.query('DROP TABLE IF EXISTS "tb_profile" CASCADE');
            console.log("✓ Dropped tb_profile table");
        } catch (err) {
            console.log("⚠ Could not drop tb_profile:", (err as Error).message);
        }
        
        // Drop old constraint if exists
        try {
            await client.query('ALTER TABLE "tb_user" DROP CONSTRAINT IF EXISTS "tb_user_profile_id_tb_profile_id_fk"');
            console.log("✓ Dropped old profile FK constraint");
        } catch (err) {
            console.log("⚠ Could not drop old constraint:", (err as Error).message);
        }
        
        // Drop old index if exists
        try {
            await client.query('DROP INDEX IF EXISTS "user_profile_idx"');
            console.log("✓ Dropped old profile index");
        } catch (err) {
            console.log("⚠ Could not drop old index:", (err as Error).message);
        }
        
        // Add new constraint if not exists
        try {
            await client.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint 
                        WHERE conname = 'tb_user_practitioner_id_tb_practitioner_id_fk'
                    ) THEN
                        ALTER TABLE "tb_user" 
                        ADD CONSTRAINT "tb_user_practitioner_id_tb_practitioner_id_fk" 
                        FOREIGN KEY ("practitioner_id") 
                        REFERENCES "public"."tb_practitioner"("id") 
                        ON DELETE SET NULL 
                        ON UPDATE NO ACTION;
                    END IF;
                END $$;
            `);
            console.log("✓ Added new practitioner FK constraint");
        } catch (err) {
            console.log("⚠ Could not add new constraint:", (err as Error).message);
        }
        
        // Create new index if not exists
        try {
            await client.query('CREATE INDEX IF NOT EXISTS "user_practitioner_idx" ON "tb_user" USING btree ("practitioner_id")');
            console.log("✓ Created new practitioner index");
        } catch (err) {
            console.log("⚠ Could not create new index:", (err as Error).message);
        }
        
        console.log("\n✅ Cleanup migration completed successfully!");
        
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanup();
