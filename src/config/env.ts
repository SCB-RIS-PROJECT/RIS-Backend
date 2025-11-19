// biome-ignore-all lint/suspicious/noConsole: <because of config file>

import z from "zod";

const EnvSchema = z.object({
    NODE_ENV: z.string().default("development"),
    PORT: z.coerce.number().default(8001),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    ALLOWED_ORIGINS: z.string(),

    // Database
    DATABASE_URL: z.string(),

    // Session
    SESSION_SECRET: z.string(),

    // Rate Limit
    RATE_LIMIT_KEY_GENERATOR: z.string(),
    RATE_LIMIT_MAX: z.coerce.number().default(100),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),

    // Mail
    MAIL_HOST: z.string(),
    MAIL_PORT: z.coerce.number(),
    MAIL_SECURE: z.coerce.boolean().default(false),
    MAIL_USER: z.string().optional(),
    MAIL_PASSWORD: z.string().optional(),
    MAIL_FROM: z.string(),

    // Satu Sehat
    SATU_SEHAT_AUTH_URL: z.string(),
    SATU_SEHAT_BASE_URL: z.string(),
    SATU_SEHAT_STAGING_URL: z.string(),
    SATU_SEHAT_ORGANIZATION_ID: z.string(),
    SATU_SEHAT_CLIENT_ID: z.string(),
    SATU_SEHAT_CLIENT_SECRET: z.string(),
});

export type env = z.infer<typeof EnvSchema>;

const { data: env, error } = EnvSchema.safeParse(process.env);

if (error) {
    console.error("❌ Invalid environment variables:");
    console.error(error.flatten().fieldErrors);
    process.exit(1);
}

export default env as env;
