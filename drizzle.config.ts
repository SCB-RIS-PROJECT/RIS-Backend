import { defineConfig } from "drizzle-kit";
import env from "@/config/env";

export default defineConfig({
    schema: "./src/database/schemas",
    out: "./src/database/migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: env.DATABASE_URL,
    },
});
