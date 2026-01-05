import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:yVmFpwa5oKNXIER2v5btb2rJWRn7JyEOxHDjb11G7C1mWVRiiKxg5ublkojDfsAY@45.80.181.4:5430/postgres";
const client = new pg.Client({ connectionString: DATABASE_URL });

async function cleanupBeforeMigration() {
    await client.connect();
    
    console.log("🧹 Cleaning up before migration...\n");
    
    // Set NULL untuk profile_id yang tidak valid (masih practitioner_id)
    const result = await client.query(`
        UPDATE tb_user SET profile_id = NULL WHERE profile_id IS NOT NULL;
    `);
    
    console.log(`✅ Cleaned ${result.rowCount} user records (set profile_id to NULL)`);
    
    await client.end();
}

cleanupBeforeMigration();
