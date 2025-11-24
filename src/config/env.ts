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
    SESSION_COOKIE_NAME: z.string().default("session_id"),
    SESSION_LIFETIME_MS: z.coerce.number().default(604800000),

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
    SATU_SEHAT_ORGANIZATION_IHS_NUMBER: z.string().optional(),

    // Orthanc (PACS)
    ORTHANC_URL: z.string().default("http://localhost"),
    ORTHANC_ACCESS_ALLOWED: z.coerce.boolean().default(true),
    ORTHANC_AUTHENTICATION_ENABLED: z.coerce.boolean().default(false),
    ORTHANC_STORAGE_COMPRESSION: z.coerce.boolean().default(false),
    ORTHANC_REGISTERED_USERS: z.string().default('{"orthanc":"orthanc"}'),
    ORTHANC_HTTP_PORT: z.coerce.number().default(8042),
    ORTHANC_DICOM_PORT: z.coerce.number().default(4242),
});

export type env = z.infer<typeof EnvSchema>;

const { data: env, error } = EnvSchema.safeParse(process.env);

if (error) {
    console.error("❌ Invalid environment variables:");
    console.error(error.flatten().fieldErrors);
    process.exit(1);
}

export default env as env;
