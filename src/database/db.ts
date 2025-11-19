import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import env from "@/config/env";
import { loggerPino } from "@/config/log";

const pool = new Pool({
    connectionString: env.DATABASE_URL,
});

const db = drizzle({
    client: pool,
    logger: {
        logQuery(query, params) {
            const logger = loggerPino;
            logger.info({ query, params }, "Executing query");
        },
    },
});

export default db;
