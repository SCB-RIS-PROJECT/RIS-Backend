import { Pool } from "pg";
import env from "../src/config/env";

const pool = new Pool({
    connectionString: env.DATABASE_URL,
});

async function checkDB() {
    const client = await pool.connect();
    
    try {
        console.log("Checking database connection and tables...\n");
        
        // Check if tb_user exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'tb_user'
            );
        `);
        
        console.log("✓ Table tb_user exists:", tableCheck.rows[0].exists);
        
        if (tableCheck.rows[0].exists) {
            // Count users
            const userCount = await client.query('SELECT COUNT(*) FROM tb_user');
            console.log("✓ Total users in db:", userCount.rows[0].count);
            
            // Show sample users
            const users = await client.query('SELECT id, name, email, practitioner_id FROM tb_user LIMIT 5');
            console.log("\nSample users:");
            console.table(users.rows);
        }
        
        console.log("\n✅ Database check completed!");
        
    } catch (err) {
        console.error("❌ Database check failed:", err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

checkDB();
